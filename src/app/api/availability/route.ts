import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { generateSlotsForDay, isWorkingDay } from "@/lib/slots";
import { WorkingHoursRow } from "@/lib/types";

const BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Липсва параметър: date е задължителен." },
      { status: 400 }
    );
  }

  // Зареди работното време
  const { data: workingHoursData, error: whError } = await supabaseServer
    .from("working_hours")
    .select("*")
    .eq("business_id", BUSINESS_ID);

  if (whError) {
    return NextResponse.json(
      { error: "Грешка при зареждане на работното време." },
      { status: 500 }
    );
  }

  const workingHours: WorkingHoursRow[] = workingHoursData ?? [];

  // isWorkingDay приема Date обект, не число — точно както е в slots.ts
  const dateObj = new Date(date);
  if (!isWorkingDay(dateObj, workingHours)) {
    return NextResponse.json({ slots: [] });
  }

  // Намери работното време за конкретния ден
  const dayOfWeek = dateObj.getDay();
  const wh = workingHours.find((w) => w.day_of_week === dayOfWeek);
  if (!wh) {
    return NextResponse.json({ slots: [] });
  }

  // Зареди всички резервации за бизнеса
  const { data: bookingsData, error: bkError } = await supabaseServer
    .from("bookings")
    .select("start_time, booking_date")
    .eq("business_id", BUSINESS_ID);

  if (bkError) {
    return NextResponse.json(
      { error: "Грешка при зареждане на резервациите." },
      { status: 500 }
    );
  }

  // ✅ FIX: .slice(0, 10) нормализира booking_date до "YYYY-MM-DD"
  // Работи независимо дали Supabase връща "2026-04-07",
  // "2026-04-07T00:00:00" или "2026-04-07T00:00:00+00:00"
  const bookedTimes = (bookingsData ?? [])
    .filter((b) => b.booking_date.slice(0, 10) === date)
    .map((b) => b.start_time.slice(0, 5));

  // generateSlotsForDay приема (startTime, endTime, bookedTimes) — точно
  // както е дефинирано в slots.ts; start_time от базата е "10:00:00",
  // slice(0, 5) → "10:00" за по-чисто подаване
  const slots = generateSlotsForDay(
    wh.start_time.slice(0, 5),
    wh.end_time.slice(0, 5),
    bookedTimes
  );

  return NextResponse.json({ slots });
}