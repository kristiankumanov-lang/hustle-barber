import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  answerTelegramCallback,
  buildConfirmKeyboard,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";
import { sendAdminBookingEmail } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: {
    id: number;
  };
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type BookingRecord = {
  id: string;
  business_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  confirmation_token: string | null;
  expires_at: string | null;
};

type ServiceRecord = {
  name: string;
};

function isValidRequest(request: NextRequest): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) return true;

  const urlSecret = request.nextUrl.searchParams.get("secret");
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");

  return urlSecret === expectedSecret || headerSecret === expectedSecret;
}

function extractStartToken(text?: string): string | null {
  if (!text) return null;

  const match = text.trim().match(/^\/start(?:\s+(.+))?$/);
  const token = match?.[1]?.trim();

  if (!token) return null;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;

  return token;
}

function extractConfirmToken(data?: string): string | null {
  if (!data?.startsWith("confirm:")) return null;

  const token = data.slice("confirm:".length).trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;

  return token;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function isExpired(booking: BookingRecord): boolean {
  return Boolean(booking.expires_at && booking.expires_at <= new Date().toISOString());
}

async function getBookingByToken(token: string): Promise<BookingRecord | null> {
  const { data, error } = await supabaseServer
    .from("bookings")
    .select(
      "id, business_id, service_id, booking_date, start_time, end_time, customer_name, customer_email, customer_phone, status, confirmation_token, expires_at"
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error) {
    console.error("Грешка при търсене на booking token:", error.message);
    return null;
  }

  return (data as BookingRecord | null) ?? null;
}

async function getServiceName(serviceId: string): Promise<string> {
  const { data, error } = await supabaseServer
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    console.error("Грешка при търсене на услуга:", error.message);
  }

  return ((data as ServiceRecord | null)?.name ?? "Избрана услуга");
}

function buildBookingPreviewText(booking: BookingRecord, serviceName: string): string {
  return [
    "💈 Потвърждение на резервация",
    "",
    `Услуга: ${serviceName}`,
    `Дата: ${formatDate(booking.booking_date)}`,
    `Час: ${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`,
    "",
    `Име: ${booking.customer_name}`,
    booking.customer_phone ? `Телефон: ${booking.customer_phone}` : null,
    booking.customer_email ? `Имейл: ${booking.customer_email}` : null,
    "",
    "Натиснете бутона, за да потвърдите часа.",
    "Ако не потвърдите до 10 минути, часът ще бъде освободен.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildConfirmedText(booking: BookingRecord, serviceName: string): string {
  return [
    "✅ Часът е потвърден.",
    "",
    `Услуга: ${serviceName}`,
    `Дата: ${formatDate(booking.booking_date)}`,
    `Час: ${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`,
    "",
    "Очакваме ви в Hustle Barber!",
  ].join("\n");
}

async function markExpired(bookingId: string) {
  const { error } = await supabaseServer
    .from("bookings")
    .update({ status: "expired" })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (error) {
    console.warn("Неуспешно маркиране като expired:", error.message);
  }
}

async function hasConfirmedOverlap(booking: BookingRecord): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from("bookings")
    .select("id")
    .eq("business_id", booking.business_id)
    .eq("booking_date", booking.booking_date)
    .eq("status", "confirmed")
    .neq("id", booking.id)
    .lt("start_time", booking.end_time)
    .gt("end_time", booking.start_time)
    .limit(1);

  if (error) {
    console.error("Грешка при проверка за overlap при потвърждение:", error.message);
    return true;
  }

  return Boolean(data && data.length > 0);
}

async function handleStart(message: TelegramMessage) {
  const chatId = message.chat.id;
  const token = extractStartToken(message.text);

  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Здравейте! Този бот служи за потвърждение на резервации в Hustle Barber. Моля, отворете линка за потвърждение от сайта."
    );
    return;
  }

  const booking = await getBookingByToken(token);

  if (!booking) {
    await sendTelegramMessage(
      chatId,
      "Линкът за потвърждение е невалиден. Моля, направете нова резервация от сайта."
    );
    return;
  }

  const serviceName = await getServiceName(booking.service_id);

  if (booking.status === "confirmed") {
    await sendTelegramMessage(chatId, buildConfirmedText(booking, serviceName));
    return;
  }

  if (booking.status !== "pending") {
    await sendTelegramMessage(
      chatId,
      "Тази резервация вече не е активна. Моля, изберете нов свободен час от сайта."
    );
    return;
  }

  if (isExpired(booking)) {
    await markExpired(booking.id);
    await sendTelegramMessage(
      chatId,
      "Времето за потвърждение изтече. Часът е освободен. Моля, направете нова резервация от сайта."
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    buildBookingPreviewText(booking, serviceName),
    buildConfirmKeyboard(token)
  );
}

async function handleConfirm(callbackQuery: TelegramCallbackQuery) {
  const token = extractConfirmToken(callbackQuery.data);
  const message = callbackQuery.message;
  const chatId = message?.chat.id;
  const messageId = message?.message_id;

  if (!token || !chatId || !messageId) {
    await answerTelegramCallback(callbackQuery.id, "Невалидна заявка.", true);
    return;
  }

  const booking = await getBookingByToken(token);

  if (!booking) {
    await answerTelegramCallback(callbackQuery.id, "Невалиден линк.", true);
    await editTelegramMessage(
      chatId,
      messageId,
      "Линкът за потвърждение е невалиден. Моля, направете нова резервация от сайта."
    );
    return;
  }

  const serviceName = await getServiceName(booking.service_id);

  if (booking.status === "confirmed") {
    await answerTelegramCallback(callbackQuery.id, "Часът вече е потвърден.");
    await editTelegramMessage(chatId, messageId, buildConfirmedText(booking, serviceName));
    return;
  }

  if (booking.status !== "pending" || isExpired(booking)) {
    await markExpired(booking.id);
    await answerTelegramCallback(callbackQuery.id, "Времето за потвърждение изтече.", true);
    await editTelegramMessage(
      chatId,
      messageId,
      "Времето за потвърждение изтече. Часът е освободен. Моля, направете нова резервация от сайта."
    );
    return;
  }

  const overlap = await hasConfirmedOverlap(booking);
  if (overlap) {
    await markExpired(booking.id);
    await answerTelegramCallback(callbackQuery.id, "Часът вече е зает.", true);
    await editTelegramMessage(
      chatId,
      messageId,
      "За съжаление този час вече е зает. Моля, изберете друг свободен час от сайта."
    );
    return;
  }

  const confirmedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await supabaseServer
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_at: confirmedAt,
      telegram_user_id: callbackQuery.from.id,
      telegram_chat_id: chatId,
      telegram_username: callbackQuery.from.username ?? null,
    })
    .eq("id", booking.id)
    .eq("status", "pending")
    .select(
      "id, business_id, service_id, booking_date, start_time, end_time, customer_name, customer_email, customer_phone, status, confirmation_token, expires_at"
    )
    .single();

  if (updateError || !updatedData) {
    console.error("Грешка при потвърждение:", updateError?.message);
    await answerTelegramCallback(callbackQuery.id, "Грешка при потвърждение.", true);
    return;
  }

  const updatedBooking = updatedData as BookingRecord;

  try {
    await sendAdminBookingEmail({
      customer_name: updatedBooking.customer_name,
      customer_email: updatedBooking.customer_email,
      customer_phone: updatedBooking.customer_phone,
      service_name: serviceName,
      booking_date: updatedBooking.booking_date,
      start_time: updatedBooking.start_time,
      end_time: updatedBooking.end_time,
    });
  } catch (emailError) {
    console.error("Грешка при admin email след Telegram confirmation:", emailError);
  }

  await answerTelegramCallback(callbackQuery.id, "Часът е потвърден.");
  await editTelegramMessage(chatId, messageId, buildConfirmedText(updatedBooking, serviceName));
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "telegram-webhook" });
}

export async function POST(request: NextRequest) {
  if (!isValidRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    if (update.message) {
      await handleStart(update.message);
    }

    if (update.callback_query) {
      await handleConfirm(update.callback_query);
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  // Telegram очаква бърз 200 отговор. Не връщаме грешка към Telegram за вътрешни проблеми.
  return NextResponse.json({ ok: true });
}
