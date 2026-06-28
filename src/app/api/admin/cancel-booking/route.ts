/**
 * POST /api/admin/cancel-booking
 * body: { booking_id: string }
 *
 * Отмяна на резервация от админ панела. По-разрешителен от публичния
 * /api/cancel (който иска cancel_token + е с двустъпков flow):
 *   - тук admin-ът може да отменя по id, без token
 *   - admin може да отменя и днешни часове (публичният cancel изисква бъдеще)
 *   - все пак не позволява отмяна на вече отменени/изтекли
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser, isBarberUser } from "@/lib/supabase-server-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { booking_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Невалидни данни." },
      { status: 400 }
    );
  }

  const bookingId = body?.booking_id?.trim();
  if (!bookingId || !/^[a-f0-9-]{36}$/i.test(bookingId)) {
    return NextResponse.json(
      { ok: false, message: "Невалиден booking_id." },
      { status: 400 }
    );
  }

  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("Admin cancel: грешка при заявка:", error.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при заявката." },
      { status: 500 }
    );
  }

  if (!booking) {
    return NextResponse.json(
      { ok: false, message: "Резервацията не съществува." },
      { status: 404 }
    );
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  if (booking.status !== "confirmed" && booking.status !== "pending") {
    return NextResponse.json(
      {
        ok: false,
        message: `Резервация в статус "${booking.status}" не може да бъде отменена.`,
      },
      { status: 400 }
    );
  }

  const { data: updated, error: updErr } = await supabaseServer
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .in("status", ["confirmed", "pending"])
    .select("id")
    .maybeSingle();

  if (updErr) {
    console.error("Admin cancel: update грешка:", updErr.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при отмяна." },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  return NextResponse.json({ ok: true });
}
