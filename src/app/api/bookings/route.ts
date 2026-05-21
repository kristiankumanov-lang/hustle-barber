/**
 * POST /api/bookings
 * Новите резервации влизат като pending и чакат Telegram потвърждение.
 * email и phone са optional — само name е задължително от клиентските данни.
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { CreateBookingPayload } from "@/lib/types";
import { getTodaySofia } from "@/lib/slots";
import { buildTelegramConfirmUrl } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const HOLD_MINUTES = 10;

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

function isActiveBooking(status: string | null, expiresAt: string | null, nowIso: string) {
  if (status === "confirmed") return true;
  if (status === "pending" && expiresAt && expiresAt > nowIso) return true;
  return false;
}

function createConfirmationToken(): string {
  // Telegram /start parameter supports letters, digits, _ and - up to 64 chars.
  return randomUUID().replaceAll("-", "");
}

export async function POST(request: NextRequest) {
  if (!process.env.TELEGRAM_BOT_USERNAME) {
    return NextResponse.json(
      { success: false, message: "Telegram bot username не е конфигуриран." },
      { status: 500 }
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
    customer_email,
    customer_phone,
  } = body;

  if (!business_id || !service_id || !booking_date || !start_time || !customer_name) {
    return NextResponse.json(
      { success: false, message: "Липсват задължителни полета." },
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

  // 🔒 Server-side guard: не позволявай записване за днес или минала дата.
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

  // Lazy cleanup само за този ден.
  await supabaseServer
    .from("bookings")
    .update({ status: "expired" })
    .eq("business_id", business_id)
    .eq("booking_date", booking_date)
    .eq("status", "pending")
    .lt("expires_at", nowIso);

  // Проверка за overlap срещу confirmed + активни pending записи.
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

  const confirmationToken = createConfirmationToken();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

  const { data: insertedBooking, error: insertError } = await supabaseServer
    .from("bookings")
    .insert({
      business_id,
      service_id,
      booking_date,
      start_time: startTimeDb,
      end_time: endTimeDb,
      customer_name: customer_name.trim(),
      customer_email: customer_email?.trim() || null,
      customer_phone: customer_phone?.trim() || null,
      status: "pending",
      confirmation_token: confirmationToken,
      expires_at: expiresAt,
      confirmed_at: null,
    })
    .select("id, confirmation_token, expires_at")
    .single();

  if (insertError || !insertedBooking) {
    console.error("Грешка при запис:", insertError?.message);
    return NextResponse.json(
      { success: false, message: "Грешка при запазване на часа." },
      { status: 500 }
    );
  }

  const telegramConfirmUrl = buildTelegramConfirmUrl(confirmationToken);

  return NextResponse.json({
    success: true,
    status: "pending",
    bookingId: insertedBooking.id,
    expiresAt: insertedBooking.expires_at,
    telegramConfirmUrl,
    message:
      "Часът е временно запазен. Потвърдете го в Telegram до 10 минути.",
  });
}
