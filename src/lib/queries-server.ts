/**
 * Server-only варианти на queries.ts — ползват supabaseServer (service role)
 * директно от Server Component-и, за да могат business/services/working-hours/
 * blocked-days да дойдат вече вградени в първоначалния HTML, вместо да чакаме
 * client JS да хидратира и после да ги fetch-не (waterfall).
 *
 * НИКОГА не импортирай този файл в client components.
 */

import { supabaseServer, isServerConfigured } from "./supabase-server";
import { BusinessRow, Service, WorkingHoursRow } from "./types";
import { getTodaySofia } from "./slots";

const BLOCKED_DAYS_AHEAD = 60; // огледва /api/blocked-days

function addDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export interface InitialBookingData {
  businessId: string;
  businessName: string;
  services: Service[];
  workingHours: WorkingHoursRow[];
  blockedDays: string[];
  loadError: string;
}

/**
 * Огледва точно логиката на loadData() от useBooking.ts (същите error
 * съобщения, същите условия), само че се изпълнява на сървъра при render,
 * вместо в useEffect след hydration.
 */
export async function loadInitialBookingData(): Promise<InitialBookingData> {
  const empty: Omit<InitialBookingData, "loadError"> = {
    businessId: "",
    businessName: "",
    services: [],
    workingHours: [],
    blockedDays: [],
  };

  if (!isServerConfigured()) {
    return { ...empty, loadError: "Supabase не е конфигуриран. Проверете .env.local" };
  }

  const { data: business, error: businessError } = await supabaseServer
    .from("business")
    .select("id, name")
    .limit(1)
    .single();

  if (businessError || !business) {
    return { ...empty, loadError: "Няма намерен бизнес в базата данни." };
  }

  const businessRow = business as BusinessRow;

  const [servicesRes, hoursRes, blockedDates] = await Promise.all([
    supabaseServer
      .from("services")
      .select("id, business_id, name, duration_minutes")
      .eq("business_id", businessRow.id),
    supabaseServer
      .from("working_hours")
      .select("id, business_id, day_of_week, start_time, end_time")
      .eq("business_id", businessRow.id),
    (async () => {
      const from = getTodaySofia();
      const to = addDays(from, BLOCKED_DAYS_AHEAD);
      const { data, error } = await supabaseServer
        .from("blocked_days")
        .select("blocked_date")
        .eq("business_id", businessRow.id)
        .gte("blocked_date", from)
        .lte("blocked_date", to);
      if (error) return [] as string[];
      return (data ?? []).map((r) => r.blocked_date as string);
    })(),
  ]);

  const services = (servicesRes.data ?? []) as Service[];
  const workingHours = (hoursRes.data ?? []) as WorkingHoursRow[];

  return {
    businessId: businessRow.id,
    businessName: businessRow.name,
    services,
    workingHours,
    blockedDays: blockedDates,
    loadError: services.length === 0 ? "Няма добавени услуги в базата данни." : "",
  };
}
