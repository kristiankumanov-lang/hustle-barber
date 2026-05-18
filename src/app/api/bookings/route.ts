/**
 * POST /api/bookings
 * email и phone са optional — само name е задължително от клиентските данни
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, isServerConfigured } from "@/lib/supabase-server";
import { CreateBookingPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
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
    return NextResponse.json({ success: false, message: "Невалидни данни." }, { status: 400 });
  }

  const { business_id, service_id, booking_date, start_time, customer_name, customer_email, customer_phone } = body;

  // Задължителни: business_id, service_id, booking_date, start_time, customer_name
  // customer_email и customer_phone са optional
  if (!business_id || !service_id || !booking_date || !start_time || !customer_name) {
    return NextResponse.json({ success: false, message: "Липсват задължителни полета." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return NextResponse.json({ success: false, message: "Невалиден формат на дата." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(start_time)) {
    return NextResponse.json({ success: false, message: "Невалиден формат на час." }, { status: 400 });
  }

  // Зареди услуга
  const { data: serviceData, error: svcError } = await supabaseServer
    .from("services").select("duration_minutes")
    .eq("id", service_id).eq("business_id", business_id).single();

  if (svcError || !serviceData) {
    return NextResponse.json({ success: false, message: "Невалидна услуга." }, { status: 400 });
  }

  const end_time = addMinutes(start_time, serviceData.duration_minutes);

  // Проверка за overlap
  const { data: conflicts, error: conflictError } = await supabaseServer
    .from("bookings").select("id")
    .eq("business_id", business_id).eq("booking_date", booking_date).eq("status", "confirmed")
    .lt("start_time", end_time + ":00").gt("end_time", start_time + ":00").limit(1);

  if (conflictError) {
    return NextResponse.json({ success: false, message: "Грешка при проверка на наличността." }, { status: 500 });
  }
  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { success: false, message: "Този час вече е зает. Моля, изберете друг." },
      { status: 409 }
    );
  }

  // Insert
  const { error: insertError } = await supabaseServer.from("bookings").insert({
    business_id,
    service_id,
    booking_date,
    start_time: start_time + ":00",
    end_time:   end_time   + ":00",
    customer_name,
    customer_email: customer_email || null,   // optional
    customer_phone: customer_phone || null,   // optional
    status: "confirmed",
  });

  if (insertError) {
    console.error("Грешка при запис:", insertError.message);
    return NextResponse.json({ success: false, message: "Грешка при запазване на часа." }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Часът е запазен успешно." });
}
