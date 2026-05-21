import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { generateSlotsForDay, isWorkingDay, getTodaySofia } from "@/lib/slots";
import { WorkingHoursRow } from "@/lib/types";

const FALLBACK_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

function isActiveBooking(status: string | null, expiresAt: string | null, nowIso: string) {
  if (status === "confirmed") return true;
  if (status === "pending" && expiresAt && expiresAt > nowIso) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const businessId = searchParams.get("business_id") ?? FALLBACK_BUSINESS_ID;

  if (!date) {
    return NextResponse.json(
      { error: "Липсва параметър: date е задължителен." },
      { status: 400 }
    );
  }

  // 🔒 Блокирай днешния ден и всички минали дати (по българско време).
  if (date <= getTodaySofia()) {
    return NextResponse.json({ slots: [] });
  }

  const { data: workingHoursData, error: whError } = await supabaseServer
    .from("working_hours")
    .select("*")
    .eq("business_id", businessId);

  if (whError) {
    console.error("Грешка при зареждане на работното време:", whError.message);
    return NextResponse.json(
      { error: "Грешка при зареждане на работното време." },
      { status: 500 }
    );
  }

  const workingHours: WorkingHoursRow[] = workingHoursData ?? [];
  const dateObj = new Date(date + "T00:00:00");

  if (!isWorkingDay(dateObj, workingHours)) {
    return NextResponse.json({ slots: [] });
  }

  const dayOfWeek = dateObj.getDay();
  const wh = workingHours.find((w) => w.day_of_week === dayOfWeek);

  if (!wh) {
    return NextResponse.json({ slots: [] });
  }

  const nowIso = new Date().toISOString();

  // Lazy expiry: не чакаме cron. При всяко четене маркираме старите pending записи като expired.
  const { error: expireError } = await supabaseServer
    .from("bookings")
    .update({ status: "expired" })
    .eq("business_id", businessId)
    .eq("booking_date", date)
    .eq("status", "pending")
    .lt("expires_at", nowIso);

  if (expireError) {
    console.warn("Неуспешно lazy expire на pending bookings:", expireError.message);
  }

  const { data: bookingsData, error: bkError } = await supabaseServer
    .from("bookings")
    .select("start_time, booking_date, status, expires_at")
    .eq("business_id", businessId)
    .eq("booking_date", date)
    .in("status", ["confirmed", "pending"]);

  if (bkError) {
    console.error("Грешка при зареждане на резервациите:", bkError.message);
    return NextResponse.json(
      { error: "Грешка при зареждане на резервациите." },
      { status: 500 }
    );
  }

  const bookedTimes = (bookingsData ?? [])
    .filter((b) => isActiveBooking(b.status, b.expires_at, nowIso))
    .map((b) => b.start_time.slice(0, 5));

  const slots = generateSlotsForDay(
    wh.start_time.slice(0, 5),
    wh.end_time.slice(0, 5),
    bookedTimes
  );

  return NextResponse.json({ slots });
}
