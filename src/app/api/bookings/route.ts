/**
 * POST /api/bookings (v2)
 *
 * Промени спрямо v1:
 *  - Телефон е задължителен.
 *  - reCAPTCHA v3 верификация (score >= RECAPTCHA_MIN_SCORE).
 *  - Записът влиза директно като "confirmed" (без Telegram потвърждение).
 *  - Генерират се ДВА различни token-а: cancel_token и reminder_token.
 *  - Връща telegramReminderUrl за opt-in от страна на клиента (без potvurzhdenie).
 *  - Веднага праща структуриран мейл към барбера с бутон "Отмени часа".
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, isServerConfigured } from "@/lib/supabase-server";
import { CreateBookingPayload } from "@/lib/types";
import { getTodaySofia } from "@/lib/slots";
import { sendAdminBookingEmail } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

const RECAPTCHA_MIN_SCORE = 0.5;
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// Български мобилен формат: 0XXXXXXXXX (10 цифри) или +359XXXXXXXXX.
// Приема и с интервали/тирета — нормализираме преди валидация.
const PHONE_DIGITS_MIN = 9;
const PHONE_DIGITS_MAX = 13;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60)
    .toString()
    .padStart(2, "0")}`;
}

function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, "");
}

function isValidPhone(raw: string): boolean {
  const phone = normalizePhone(raw);
  // Само цифри и евентуален водещ "+"
  if (!/^\+?\d+$/.test(phone)) return false;
  const digits = phone.replace(/^\+/, "");
  if (digits.length < PHONE_DIGITS_MIN || digits.length > PHONE_DIGITS_MAX) return false;
  return true;
}

async function verifyRecaptcha(token: string, remoteip?: string): Promise<{
  ok: boolean;
  score: number;
  reason?: string;
}> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return { ok: false, score: 0, reason: "RECAPTCHA_SECRET_KEY липсва" };
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteip) params.set("remoteip", remoteip);

  try {
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (!data?.success) {
      return { ok: false, score: 0, reason: `recaptcha failed: ${(data?.["error-codes"] ?? []).join(",")}` };
    }

    const score: number = typeof data.score === "number" ? data.score : 0;
    return { ok: score >= RECAPTCHA_MIN_SCORE, score };
  } catch (e) {
    return { ok: false, score: 0, reason: `recaptcha fetch error: ${String(e)}` };
  }
}

function isActiveBooking(status: string | null, expiresAt: string | null, nowIso: string) {
  if (status === "confirmed") return true;
  // Старите pending записи от v1 — оставяме съвместимост: ако още са в hold периода → блокиращи.
  if (status === "pending" && expiresAt && expiresAt > nowIso) return true;
  return false;
}

function buildTelegramReminderUrl(reminderToken: string): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `https://t.me/${username.replace("@", "")}?start=${encodeURIComponent(reminderToken)}`;
}

export async function POST(request: NextRequest) {
  if (!isServerConfigured()) {
    return NextResponse.json(
      { success: false, message: "Supabase не е конфигуриран на сървъра." },
      { status: 503 }
    );
  }

  let body: CreateBookingPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Невалидни данни." },
      { status: 400 }
    );
  }

  const {
    business_id,
    service_id,
    booking_date,
    start_time,
    customer_name,
    customer_phone,
    customer_email,
    recaptcha_token,
  } = body;

  // === Валидация ===
  if (!business_id || !service_id || !booking_date || !start_time || !customer_name) {
    return NextResponse.json(
      { success: false, message: "Липсват задължителни полета." },
      { status: 400 }
    );
  }

  if (!customer_phone || !customer_phone.trim()) {
    return NextResponse.json(
      { success: false, message: "Телефонът е задължителен." },
      { status: 400 }
    );
  }

  if (!isValidPhone(customer_phone)) {
    return NextResponse.json(
      { success: false, message: "Невалиден формат на телефона." },
      { status: 400 }
    );
  }

  if (!recaptcha_token) {
    return NextResponse.json(
      { success: false, message: "Липсва reCAPTCHA проверка." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return NextResponse.json(
      { success: false, message: "Невалиден формат на дата." },
      { status: 400 }
    );
  }
  if (!/^\d{2}:\d{2}$/.test(start_time)) {
    return NextResponse.json(
      { success: false, message: "Невалиден формат на час." },
      { status: 400 }
    );
  }

  // 🔒 Не позволявай записване за днес или минала дата.
  if (booking_date <= getTodaySofia()) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Записване за днешния ден вече не е възможно. Моля, изберете следващ свободен ден.",
      },
      { status: 400 }
    );
  }

  // === reCAPTCHA ===
  const remoteIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const recap = await verifyRecaptcha(recaptcha_token, remoteIp);
  if (!recap.ok) {
    console.warn("reCAPTCHA блокира заявка:", recap);
    return NextResponse.json(
      { success: false, message: "Защитата срещу спам не позволи заявката. Опитай отново." },
      { status: 403 }
    );
  }

  // === Услуга ===
  const { data: serviceData, error: svcError } = await supabaseServer
    .from("services")
    .select("duration_minutes, name")
    .eq("id", service_id)
    .eq("business_id", business_id)
    .single();

  if (svcError || !serviceData) {
    return NextResponse.json(
      { success: false, message: "Невалидна услуга." },
      { status: 400 }
    );
  }

  const end_time = addMinutes(start_time, serviceData.duration_minutes);
  const startTimeDb = toDbTime(start_time);
  const endTimeDb = toDbTime(end_time);
  const nowIso = new Date().toISOString();

  // Lazy cleanup на стари pending записи от v1 (обратна съвместимост).
  await supabaseServer
    .from("bookings")
    .update({ status: "expired" })
    .eq("business_id", business_id)
    .eq("booking_date", booking_date)
    .eq("status", "pending")
    .lt("expires_at", nowIso);

  // === Overlap проверка ===
  const { data: conflicts, error: conflictError } = await supabaseServer
    .from("bookings")
    .select("id, status, expires_at")
    .eq("business_id", business_id)
    .eq("booking_date", booking_date)
    .in("status", ["confirmed", "pending"])
    .lt("start_time", endTimeDb)
    .gt("end_time", startTimeDb);

  if (conflictError) {
    console.error("Грешка при проверка на наличността:", conflictError.message);
    return NextResponse.json(
      { success: false, message: "Грешка при проверка на наличността." },
      { status: 500 }
    );
  }

  const activeConflict = (conflicts ?? []).some((b) =>
    isActiveBooking(b.status, b.expires_at, nowIso)
  );

  if (activeConflict) {
    return NextResponse.json(
      { success: false, message: "Този час вече е зает. Моля, изберете друг." },
      { status: 409 }
    );
  }

  // === Token-и ===
  // Два РАЗЛИЧНИ token-а: cancel и reminder.
  // НИКОГА не се replace-ват един друг — всеки има тесен scope.
  const cancelToken = randomUUID();
  const reminderToken = randomUUID();

  // === Insert като CONFIRMED ===
  const normalizedPhone = normalizePhone(customer_phone);

  const { data: inserted, error: insertError } = await supabaseServer
    .from("bookings")
    .insert({
      business_id,
      service_id,
      booking_date,
      start_time: startTimeDb,
      end_time: endTimeDb,
      customer_name: customer_name.trim(),
      customer_phone: normalizedPhone,
      customer_email: customer_email?.trim() || null,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      cancel_token: cancelToken,
      reminder_token: reminderToken,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Грешка при запис:", insertError?.message);
    return NextResponse.json(
      { success: false, message: "Грешка при запазване на часа." },
      { status: 500 }
    );
  }

  // === Мейл към барбера ===
  try {
    await sendAdminBookingEmail({
      booking_id: inserted.id,
      customer_name: customer_name.trim(),
      customer_phone: normalizedPhone,
      customer_email: customer_email?.trim() || null,
      service_name: serviceData.name,
      duration_minutes: serviceData.duration_minutes,
      booking_date,
      start_time: startTimeDb,
      end_time: endTimeDb,
      cancel_token: cancelToken,
    });
  } catch (emailError) {
    // Мейлът не е критичен — booking-ът вече е в базата.
    console.error("Грешка при admin email:", emailError);
  }

  // === Отговор ===
  return NextResponse.json({
    success: true,
    status: "confirmed",
    bookingId: inserted.id,
    telegramReminderUrl: buildTelegramReminderUrl(reminderToken),
    message: "Часът ви е запазен успешно!",
  });
}