/**
 * GET /api/admin/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD&include_past=true
 *
 * Връща резервации в дадения период. Само за authenticated barber users.
 * Минава през service_role (заобикаля RLS), но защитен от middleware-а
 * + допълнителна auth проверка тук (defense in depth).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser, isBarberUser } from "@/lib/supabase-server-auth";

export const dynamic = "force-dynamic";

const BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  // 🔒 Защита: проверка че user-ът е логнат barber.
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Параметрите from и to са задължителни (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: "Невалиден формат на дата." },
      { status: 400 }
    );
  }

  // Зареди bookings + service name (join през service_id)
  const { data, error } = await supabaseServer
    .from("bookings")
    .select(
      `
      id,
      booking_date,
      start_time,
      end_time,
      customer_name,
      customer_phone,
      customer_email,
      status,
      created_at,
      confirmed_at,
      cancelled_at,
      service_id,
      services ( name, duration_minutes )
      `
    )
    .eq("business_id", BUSINESS_ID)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Admin bookings: грешка при заявка:", error.message);
    return NextResponse.json(
      { error: "Грешка при зареждане на резервациите." },
      { status: 500 }
    );
  }

  // Подреждаме service name-а на първо ниво за по-лесно ползване във frontend.
  type RawBooking = (typeof data)[number] & {
    services?: { name?: string; duration_minutes?: number } | null;
  };

  const bookings = (data ?? []).map((b) => {
    const raw = b as RawBooking;
    return {
      id: raw.id,
      booking_date: raw.booking_date,
      start_time: raw.start_time,
      end_time: raw.end_time,
      customer_name: raw.customer_name,
      customer_phone: raw.customer_phone,
      customer_email: raw.customer_email,
      status: raw.status,
      created_at: raw.created_at,
      confirmed_at: raw.confirmed_at,
      cancelled_at: raw.cancelled_at,
      service_name: raw.services?.name ?? "—",
      duration_minutes: raw.services?.duration_minutes ?? null,
    };
  });

  return NextResponse.json({ bookings });
}
