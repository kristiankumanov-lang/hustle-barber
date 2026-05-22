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

// Максимум потвърдени часа на един Telegram акаунт за един и същи ден.
const MAX_CONFIRMED_PER_DAY = 1;

// Телефон на салона — смени плейсхолдъра с реалния номер.
const SHOP_PHONE = "[0886695870]";

// Telegram акаунти, които прескачат дневния лимит (за тестване).
// Задава се в env: TELEGRAM_ADMIN_IDS="991950550,123456789"
// В прод просто не задавай променливата → списъкът е празен.
const ADMIN_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function isAdminId(telegramUserId: number): boolean {
  return ADMIN_IDS.has(String(telegramUserId));
}

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

/**
 * Брои колко ПОТВЪРДЕНИ часа вече има този Telegram акаунт за същия ден.
 * Използваме telegram_user_id (акаунтът), не chat_id.
 * Изключваме текущата резервация (excludeId), за да не брои сама себе си.
 */
async function countConfirmedSameDay(
  telegramUserId: number,
  bookingDate: string,
  excludeId: string
): Promise<number> {
  const { count, error } = await supabaseServer
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("telegram_user_id", telegramUserId)
    .eq("booking_date", bookingDate)
    .eq("status", "confirmed")
    .neq("id", excludeId);

  if (error) {
    console.error("Грешка при броене на дневен лимит:", error.message);
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────
// Текстове на бота (закачлив тон)
// ─────────────────────────────────────────────────────────────

function buildBookingPreviewText(booking: BookingRecord, serviceName: string): string {
  return [
    "Опаа, момчето си е запазило час за посещение! 💈",
    "Ще се радвам да се видим, айде сега да си потвърдиш часа 👇",
    "",
    `Услуга: ${serviceName}`,
    `Дата: ${formatDate(booking.booking_date)}`,
    `Час: ${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`,
    "",
    `Име: ${booking.customer_name}`,
    booking.customer_phone ? `Телефон: ${booking.customer_phone}` : null,
    booking.customer_email ? `Имейл: ${booking.customer_email}` : null,
    "",
    "Натисни бутона, за да потвърдиш.",
    "Ако не потвърдиш до 10 минути, часът се освобождава.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildConfirmedText(booking: BookingRecord, serviceName: string): string {
  return [
    "Евала машинкаа! 🔥 Чакам те тогава.",
    "А ако нещо не успееш да дойдеш — знаеш, предпочитам да ми кажеш навреме, за да си запазим добрите отношения 😄",
    "",
    `Услуга: ${serviceName}`,
    `Дата: ${formatDate(booking.booking_date)}`,
    `Час: ${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`,
    "",
    "До скоро в Hustle Barber! 💈",
  ].join("\n");
}

function buildLimitText(bookingDate: string): string {
  return [
    "Братле, вече имаш час за този ден! 😅",
    `Искаш да го сменим? Call me 📞 ${SHOP_PHONE}`,
    "",
    `Дата: ${formatDate(bookingDate)}`,
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
      "Здрасти! 👋 Този бот потвърждава часовете в Hustle Barber. Отвори линка за потвърждение от сайта."
    );
    return;
  }

  const booking = await getBookingByToken(token);

  if (!booking) {
    await sendTelegramMessage(
      chatId,
      "Хмм, тоя линк не върши работа. 🤔 Направи нова резервация от сайта."
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
      "Тоя час вече не е активен. Избери нов свободен час от сайта. 💈"
    );
    return;
  }

  if (isExpired(booking)) {
    await markExpired(booking.id);
    await sendTelegramMessage(
      chatId,
      "Опа, времето за потвърждение изтече и часът се освободи. ⏰ Пробвай пак от сайта."
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
      "Хмм, тоя линк не върши работа. 🤔 Направи нова резервация от сайта."
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
      "Опа, времето за потвърждение изтече и часът се освободи. ⏰ Пробвай пак от сайта."
    );
    return;
  }

  // 🔒 Дневен лимит: максимум 1 потвърден час на Telegram акаунт за деня.
  // Админ акаунтите (TELEGRAM_ADMIN_IDS) прескачат лимита — за тестване.
  if (!isAdminId(callbackQuery.from.id)) {
    const confirmedToday = await countConfirmedSameDay(
      callbackQuery.from.id,
      booking.booking_date,
      booking.id
    );

    if (confirmedToday >= MAX_CONFIRMED_PER_DAY) {
      await markExpired(booking.id);
      await answerTelegramCallback(callbackQuery.id, "Вече имаш час за този ден.", true);
      await editTelegramMessage(chatId, messageId, buildLimitText(booking.booking_date));
      return;
    }
  }

  const overlap = await hasConfirmedOverlap(booking);
  if (overlap) {
    await markExpired(booking.id);
    await answerTelegramCallback(callbackQuery.id, "Часът вече е зает.", true);
    await editTelegramMessage(
      chatId,
      messageId,
      "Ееех, някой те изпревари за тоя час. 😬 Избери друг свободен от сайта."
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

  await answerTelegramCallback(callbackQuery.id, "Часът е потвърден! 🔥");
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

  return NextResponse.json({ ok: true });
}