/**
 * POST /api/cancel
 *
 * One-click отмяна от админ мейла. САМО POST, не GET — защото мейл scanner-и
 * (Outlook Safe Links, Gmail preview, antivirus) отварят линкове превантивно
 * и destructive action на GET би се изпълнил без барберът да е цъкал.
 *
 * Guard ред:
 *   1. token идва в body
 *   2. token съществува в базата
 *   3. booking.status === 'confirmed' (idempotent: ако cancelled → казваме че вече е отменен)
 *   4. start (booking_date + start_time, по българско време) > now
 *   5. ако всичко е ОК → status = 'cancelled', cancelled_at = now
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAdminCancelEmail } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

// Часовете в базата са в българско време. Изчисляваме отместването на
// Europe/Sofia спрямо UTC за конкретен момент (лято +3, зима +2).
function sofiaOffsetMinutes(at: Date): number {
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = tz.formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

function bookingStartUtc(bookingDate: string, startTime: string): Date {
  const [y, mo, d] = bookingDate.split("-").map(Number);
  const [h, mi] = startTime.slice(0, 5).split(":").map(Number);
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = sofiaOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offset * 60000);
}

type CancelResult =
  | { ok: true; alreadyCancelled?: boolean }
  | { ok: false; reason: "invalid" | "past" | "wrong_status" | "server_error"; message: string };

export async function POST(request: NextRequest): Promise<NextResponse<CancelResult>> {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid", message: "Невалидни данни." },
      { status: 400 }
    );
  }

  const token = body?.token?.trim();

  if (!token || !/^[A-Za-z0-9-]{8,64}$/.test(token)) {
    return NextResponse.json(
      { ok: false, reason: "invalid", message: "Невалиден линк за отмяна." },
      { status: 400 }
    );
  }

  // 1+2. Намери booking-а по token-а.
  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .select(
      "id, booking_date, start_time, end_time, customer_name, customer_phone, customer_email, status, service_id"
    )
    .eq("cancel_token", token)
    .maybeSingle();

  if (error) {
    console.error("Cancel: грешка при заявка:", error.message);
    return NextResponse.json(
      { ok: false, reason: "server_error", message: "Възникна грешка. Опитай пак." },
      { status: 500 }
    );
  }

  if (!booking) {
    return NextResponse.json(
      { ok: false, reason: "invalid", message: "Линкът за отмяна не е валиден." },
      { status: 404 }
    );
  }

  // 3. Idempotency — ако вече е отменен, върни „вече беше отменен".
  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      {
        ok: false,
        reason: "wrong_status",
        message: "Тази резервация не може да бъде отменена (статус: " + booking.status + ").",
      },
      { status: 400 }
    );
  }

  // 4. Часът трябва да е в бъдещето (по българско време).
  const startUtc = bookingStartUtc(booking.booking_date, booking.start_time);
  if (startUtc.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "past",
        message: "Часът вече е минал. Линкът за отмяна не е валиден.",
      },
      { status: 400 }
    );
  }

  // 5. Отмени. Atomic guard срещу race condition.
  const { data: updated, error: updError } = await supabaseServer
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("status", "confirmed") // защита ако някой друг междувременно е cancelled-нал
    .select("id")
    .maybeSingle();

  if (updError) {
    console.error("Cancel: грешка при update:", updError.message);
    return NextResponse.json(
      { ok: false, reason: "server_error", message: "Възникна грешка. Опитай пак." },
      { status: 500 }
    );
  }

  if (!updated) {
    // Между read-а и update-а някой го е променил — пробвай отново да го прочетеш.
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  // Известяваме барбера. Best-effort — провал тук НЕ хвърля грешка нагоре
  // и НЕ променя отговора към клиента (отказът вече е записан в базата).
  try {
    const { data: svc } = await supabaseServer
      .from("services")
      .select("name")
      .eq("id", booking.service_id)
      .maybeSingle();

    await sendAdminCancelEmail({
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      service_name: svc?.name ?? "—",
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
  } catch (e) {
    console.error("Cancel: грешка при admin email:", e);
  }

  return NextResponse.json({ ok: true });
}

// Изрично НЕ позволяваме GET — destructive action не трябва да минава през email scanners.
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
