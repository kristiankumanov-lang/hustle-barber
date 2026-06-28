/**
 * GET /api/admin/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Връща всичко нужно за календарния view на /admin/schedule:
 *   - blocked_days (цели дни почивка)
 *   - blocked_slots (отделни блокирани часове)
 *   - bookings (активни confirmed/pending — за overlay)
 *   - working_hours (за UI да знае работните часове на барбера)
 *
 * Защитен endpoint — само за authenticated barber.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser, isBarberUser } from "@/lib/supabase-server-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from и to са задължителни." },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Невалиден формат на дата." }, { status: 400 });
  }

  // Паралелни заявки за бързина
  const [blockedDaysRes, blockedSlotsRes, bookingsRes, workingHoursRes] = await Promise.all([
    supabaseServer
      .from("blocked_days")
      .select("id, blocked_date, reason")
      .eq("business_id", BUSINESS_ID)
      .gte("blocked_date", from)
      .lte("blocked_date", to),

    supabaseServer
      .from("blocked_slots")
      .select("id, blocked_date, start_time, end_time, reason")
      .eq("business_id", BUSINESS_ID)
      .gte("blocked_date", from)
      .lte("blocked_date", to),

    supabaseServer
      .from("bookings")
      .select("id, booking_date, start_time, end_time, customer_name, status, service_id, services(name)")
      .eq("business_id", BUSINESS_ID)
      .in("status", ["confirmed", "pending"])
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true }),

    supabaseServer
      .from("working_hours")
      .select("day_of_week, start_time, end_time")
      .eq("business_id", BUSINESS_ID),
  ]);

  if (blockedDaysRes.error) {
    console.error("schedule blocked_days:", blockedDaysRes.error.message);
  }
  if (blockedSlotsRes.error) {
    console.error("schedule blocked_slots:", blockedSlotsRes.error.message);
  }
  if (bookingsRes.error) {
    console.error("schedule bookings:", bookingsRes.error.message);
  }
  if (workingHoursRes.error) {
    console.error("schedule working_hours:", workingHoursRes.error.message);
  }

  type RawBooking = {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    customer_name: string;
    status: string;
    service_id: string;
    services?: { name?: string } | null;
  };

  const bookings = (bookingsRes.data ?? []).map((b) => {
    const raw = b as unknown as RawBooking;
    return {
      id: raw.id,
      booking_date: raw.booking_date,
      start_time: raw.start_time,
      end_time: raw.end_time,
      customer_name: raw.customer_name,
      status: raw.status,
      service_name: raw.services?.name ?? "—",
    };
  });

  return NextResponse.json({
    blocked_days: blockedDaysRes.data ?? [],
    blocked_slots: blockedSlotsRes.data ?? [],
    bookings,
    working_hours: workingHoursRes.data ?? [],
  });
}
