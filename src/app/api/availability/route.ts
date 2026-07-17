import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { generateSlotsForDay, isWorkingDay, getTodaySofia } from "@/lib/slots";
import { WorkingHoursRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FALLBACK_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

function isActiveBooking(status: string | null, expiresAt: string | null, nowIso: string) {
  if (status === "confirmed") return true;
  if (status === "pending" && expiresAt && expiresAt > nowIso) return true;
  return false;
}

/**
 * Връща списък от "HH:MM" низове за всеки 30-минутен слот, покрит от blocked_slot.
 * Пример: blocked_slot 14:00-16:00 → ["14:00", "14:30", "15:00", "15:30"].
 *
 * Така UI-то може да маркира всеки 30-мин слот като зает, дори ако
 * блокировката е по-дълга от един слот.
 */
function expandBlockedRangeToSlots(startTime: string, endTime: string): string[] {
  // start/end са във формат "HH:MM:SS" или "HH:MM"
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  const result: string[] = [];
  for (let t = startMin; t < endMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    result.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return result;
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

  const nowIso = new Date().toISOString();

  // Вълна 1 — четирите заявки нямат взаимна зависимост, тръгват едновременно.
  // (lazy-expire UPDATE-ът тук е "изпреварващ" спрямо bookings SELECT-а от Вълна 2,
  // не спрямо нещо в тази вълна — затова е безопасно да е редом с останалите три.)
  const [
    { data: blockedDayData, error: bdError },
    { data: workingHoursData, error: whError },
    { error: expireError },
    { data: blockedSlotsData, error: bsError },
  ] = await Promise.all([
    // 🆕 Проверка дали целия ден е блокиран от админа.
    supabaseServer
      .from("blocked_days")
      .select("id")
      .eq("business_id", businessId)
      .eq("blocked_date", date)
      .maybeSingle(),
    supabaseServer
      .from("working_hours")
      .select("*")
      .eq("business_id", businessId),
    // Lazy expiry: не чакаме cron. При всяко четене маркираме старите pending записи като expired.
    supabaseServer
      .from("bookings")
      .update({ status: "expired" })
      .eq("business_id", businessId)
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", nowIso),
    // 🆕 Блокирани отделни часове от админа.
    supabaseServer
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .eq("blocked_date", date),
  ]);

  if (bdError) {
    console.warn("Грешка при проверка на blocked_days:", bdError.message);
    // Не блокираме flow-а на тази грешка — продължаваме.
  }

  if (blockedDayData) {
    // Цял ден почивка → връщаме празен списък, точно както при non-working day.
    return NextResponse.json({ slots: [] });
  }

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

  if (expireError) {
    console.warn("Неуспешно lazy expire на pending bookings:", expireError.message);
  }

  if (bsError) {
    console.warn("Грешка при зареждане на blocked_slots:", bsError.message);
  }

  // Вълна 2 — bookings SELECT-ът трябва да изчака lazy-expire UPDATE-а от Вълна 1
  // да приключи (вече е приключил, защото сме await-нали целия Promise.all по-горе),
  // за да не преброим только-що expired запис като все още зает слот.
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

  const blockedTimes: string[] = (blockedSlotsData ?? []).flatMap((b) =>
    expandBlockedRangeToSlots(b.start_time, b.end_time)
  );

  // Сливаме всички "недостъпни" times.
  const unavailableTimes = Array.from(new Set([...bookedTimes, ...blockedTimes]));

  const slots = generateSlotsForDay(
    wh.start_time.slice(0, 5),
    wh.end_time.slice(0, 5),
    unavailableTimes
  );

  return NextResponse.json({ slots });
}
