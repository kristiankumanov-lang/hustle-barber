/**
 * POST /api/admin/manual-booking
 * body: { service_id, booking_date, start_time, customer_name, customer_phone }
 *
 * Ръчно добавяне на час от админ панела. По-разрешителен от публичния
 * /api/bookings:
 *   - БЕЗ reCAPTCHA (барберът е trusted, не бот)
 *   - БЕЗ строга phone валидация (барберът може да пише каквото знае)
 *   - БЕЗ today guard (барберът може да буукне за днес)
 *   - БЕЗ admin/client email (барберът знае какво прави, няма нужда)
 *   - Запазва веднага като confirmed
 *
 * Все пак запазва:
 *   - auth check (само barber)
 *   - overlap protection (не можеш да буукнеш върху друг час)
 *   - blocked_days / blocked_slots проверка (не може да буукнеш в блокиран ден/слот)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser, isBarberUser } from "@/lib/supabase-server-auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function toDbTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

function isActiveBooking(status: string | null, expiresAt: string | null, nowIso: string) {
  if (status === "confirmed") return true;
  if (status === "pending" && expiresAt && expiresAt > nowIso) return true;
  return false;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    service_id?: string;
    booking_date?: string;
    start_time?: string;
    customer_name?: string;
    customer_phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  }

  const { service_id, booking_date, start_time, customer_name, customer_phone } = body;

  // Базова валидация (по-разхлабена от публичната)
  if (!service_id || !booking_date || !start_time || !customer_name?.trim() || !customer_phone?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Името, телефонът, услугата, датата и часът са задължителни." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date) || !/^\d{2}:\d{2}$/.test(start_time)) {
    return NextResponse.json(
      { ok: false, message: "Невалиден формат на дата или час." },
      { status: 400 }
    );
  }

  // Услуга
  const { data: serviceData, error: svcError } = await supabaseServer
    .from("services")
    .select("duration_minutes, name")
    .eq("id", service_id)
    .eq("business_id", BUSINESS_ID)
    .single();

  if (svcError || !serviceData) {
    return NextResponse.json(
      { ok: false, message: "Невалидна услуга." },
      { status: 400 }
    );
  }

  const endTime = addMinutes(start_time, serviceData.duration_minutes);
  const startDb = toDbTime(start_time);
  const endDb = toDbTime(endTime);
  const nowIso = new Date().toISOString();

  // Блокиран ли е целия ден?
  const { data: blockedDayData } = await supabaseServer
    .from("blocked_days")
    .select("id")
    .eq("business_id", BUSINESS_ID)
    .eq("blocked_date", booking_date)
    .maybeSingle();

  if (blockedDayData) {
    return NextResponse.json(
      { ok: false, message: "Този ден е маркиран като почивка. Първо го отблокирай." },
      { status: 409 }
    );
  }

  // Блокирани слотове в обхвата на новия час
  const { data: blockedSlotsData } = await supabaseServer
    .from("blocked_slots")
    .select("start_time, end_time")
    .eq("business_id", BUSINESS_ID)
    .eq("blocked_date", booking_date);

  const conflictsWithBlocked = (blockedSlotsData ?? []).some((b) => {
    return b.start_time < endDb && b.end_time > startDb;
  });

  if (conflictsWithBlocked) {
    return NextResponse.json(
      { ok: false, message: "Този слот е блокиран. Първо го отблокирай." },
      { status: 409 }
    );
  }

  // Overlap с друга резервация
  const { data: conflicts, error: conflictError } = await supabaseServer
    .from("bookings")
    .select("id, status, expires_at")
    .eq("business_id", BUSINESS_ID)
    .eq("booking_date", booking_date)
    .in("status", ["confirmed", "pending"])
    .lt("start_time", endDb)
    .gt("end_time", startDb);

  if (conflictError) {
    console.error("Manual booking conflict check:", conflictError.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при проверка на наличността." },
      { status: 500 }
    );
  }

  const activeConflict = (conflicts ?? []).some((b) =>
    isActiveBooking(b.status, b.expires_at, nowIso)
  );

  if (activeConflict) {
    return NextResponse.json(
      { ok: false, message: "Този час вече е зает." },
      { status: 409 }
    );
  }

  // Insert като CONFIRMED, без token-и (без cancel email link, без telegram opt-in)
  const { data: inserted, error: insertError } = await supabaseServer
    .from("bookings")
    .insert({
      business_id: BUSINESS_ID,
      service_id,
      booking_date,
      start_time: startDb,
      end_time: endDb,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: null,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      // Tokens пак генерираме — за бъдеще ако се нуждае от cancel линк
      cancel_token: randomUUID(),
      reminder_token: randomUUID(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Manual booking insert:", insertError?.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при запис." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    booking_id: inserted.id,
    service_name: serviceData.name,
    end_time: endTime,
  });
}
