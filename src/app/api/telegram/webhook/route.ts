/**
 * Telegram webhook v2 — PASSIVE MODE.
 *
 * ИЗПОЛЗВА СЕ САМО за reminder opt-in от клиента:
 *  - клиентът цъка линк от SuccessMessage → отваря бота с /start <reminder_token>
 *  - ботът намира booking-а по reminder_token и записва telegram_chat_id
 *  - НЕ показва бутон за потвърждение
 *  - НЕ променя booking.status (часът вече е "confirmed" от bookings/route.ts)
 *  - НЕ има callback flow за потвърждаване
 *
 * Старите cancel/confirm flow-и са изключени.
 * Reminder cron-ът (1 час преди часа) продължава да работи независимо
 * и праща съобщение на записания telegram_chat_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const VERSION = "v2-passive-reminder";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number };
  from?: TelegramUser;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

type BookingRecord = {
  id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  reminder_token: string | null;
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
  // UUID-формат: 36 символа, само hex + тирета
  if (!/^[A-Za-z0-9-]{8,64}$/.test(token)) return null;
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

async function getServiceName(serviceId: string): Promise<string> {
  const { data } = await supabaseServer
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  return (data?.name as string) ?? "Избрана услуга";
}

async function handleStart(message: TelegramMessage) {
  const chatId = message.chat.id;
  const from = message.from;
  const token = extractStartToken(message.text);

  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Здрасти! За да получаваш напомняне за часа си, отвори линка от страницата на потвърждение в сайта."
    );
    return;
  }

  // Намери booking-а по reminder_token (passive — само ще запишем chat_id).
  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .select("id, service_id, booking_date, start_time, end_time, status, reminder_token")
    .eq("reminder_token", token)
    .maybeSingle();

  if (error) {
    console.error("Telegram webhook: грешка при заявка:", error.message);
    await sendTelegramMessage(chatId, "Възникна грешка. Опитай пак след малко.");
    return;
  }

  if (!booking) {
    await sendTelegramMessage(
      chatId,
      "Не намерих такава резервация. Може би линкът е стар или невалиден."
    );
    return;
  }

  const b = booking as BookingRecord;

  if (b.status === "cancelled" || b.status === "expired") {
    await sendTelegramMessage(
      chatId,
      "Тази резервация вече не е активна. За нов час — направи резервация от сайта."
    );
    return;
  }

  // Запиши chat_id-то на клиента, за да може reminder cron-ът да му прати съобщение.
  // НЕ променяме статуса на booking-а — той вече е "confirmed" от bookings/route.ts.
  const { error: updError } = await supabaseServer
    .from("bookings")
    .update({
      telegram_user_id: from?.id ?? null,
      telegram_chat_id: chatId,
      telegram_username: from?.username ?? null,
    })
    .eq("id", b.id);

  if (updError) {
    console.error("Telegram webhook: грешка при update:", updError.message);
    await sendTelegramMessage(chatId, "Записах те, но има проблем с напомнянето. Извинявай.");
    return;
  }

  const serviceName = await getServiceName(b.service_id);

  await sendTelegramMessage(
    chatId,
    [
      "Готово! Ще ти напомня 1 час преди часа.",
      "",
      `Услуга: ${serviceName}`,
      `Дата: ${formatDate(b.booking_date)}`,
      `Час: ${formatTime(b.start_time)} — ${formatTime(b.end_time)}`,
      "",
      "До скоро в Hustle Barber!",
    ].join("\n")
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "telegram-webhook",
    version: VERSION,
    mode: "passive-reminder-opt-in",
  });
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
    // Callback queries се игнорират — няма inline бутони в v2.
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}
