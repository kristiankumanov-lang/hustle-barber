/**
 * POST /api/bookings
 * email и phone са optional — само name е задължително от клиентските данни
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, isServerConfigured } from "@/lib/supabase-server";
import { CreateBookingPayload } from "@/lib/types";
import { getTodaySofia } from "@/lib/slots";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "kristiankumanov@gmail.com";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
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

  if (!business_id || !service_id || !booking_date || !start_time || !customer_name) {
    return NextResponse.json({ success: false, message: "Липсват задължителни полета." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return NextResponse.json({ success: false, message: "Невалиден формат на дата." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(start_time)) {
    return NextResponse.json({ success: false, message: "Невалиден формат на час." }, { status: 400 });
  }

  // 🔒 Server-side guard: не позволявай записване за днес или минала дата
  // (по българско време). Това е защитата дори някой да заобиколи frontend-а.
  if (booking_date <= getTodaySofia()) {
    return NextResponse.json(
      { success: false, message: "Записване за днешния ден вече не е възможно. Моля, изберете следващ свободен ден." },
      { status: 400 }
    );
  }

  // Зареди услуга
  const { data: serviceData, error: svcError } = await supabaseServer
    .from("services").select("duration_minutes, name")
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
    customer_email: customer_email || null,
    customer_phone: customer_phone || null,
    status: "confirmed",
  });

  if (insertError) {
    console.error("Грешка при запис:", insertError.message);
    return NextResponse.json({ success: false, message: "Грешка при запазване на часа." }, { status: 500 });
  }

  // Изпрати мейл до администратора
  console.log("Изпращане на мейл...", { hasKey: !!process.env.RESEND_API_KEY });
  try {
    await resend.emails.send({
      from: "Hustle Barber <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `🪒 Нова резервация — ${start_time} | ${formatDate(booking_date)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111; margin-bottom: 4px;">Нова резервация</h2>
          <p style="color: #666; margin-top: 0;">Hustle Barber</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #888; width: 120px;">Клиент</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111;">${customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Услуга</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111;">${serviceData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Дата</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111;">${formatDate(booking_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Час</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111; font-size: 20px;">${start_time} — ${end_time}</td>
            </tr>
            ${customer_phone ? `<tr>
              <td style="padding: 8px 0; color: #888;">Телефон</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111;">${customer_phone}</td>
            </tr>` : ""}
            ${customer_email ? `<tr>
              <td style="padding: 8px 0; color: #888;">Имейл</td>
              <td style="padding: 8px 0; color: #111;">${customer_email}</td>
            </tr>` : ""}
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">Hustle Barber · Онлайн записване</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Грешка при изпращане на мейл:", emailError);
  }

  return NextResponse.json({ success: true, message: "Часът е запазен успешно." });
}
