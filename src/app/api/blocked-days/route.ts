/**
 * GET /api/blocked-days?business_id=...
 *
 * Връща списък с блокираните бъдещи дни като ["YYYY-MM-DD", ...].
 * Публичен endpoint — клиентската booking страница го ползва, за да
 * маркира тези дни като "почивка" в календара.
 *
 * НЕ разкрива причини (reason), created_by, или други admin метаданни —
 * само самите дати.
 *
 * RLS-ът е глух за anon, затова минаваме през service_role server клиент.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getTodaySofia } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FALLBACK_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";
const DAYS_AHEAD = 60; // вземаме малко повече от 28, защото няма излишно тежко

function addDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id") ?? FALLBACK_BUSINESS_ID;

  const from = getTodaySofia();
  const to = addDays(from, DAYS_AHEAD);

  const { data, error } = await supabaseServer
    .from("blocked_days")
    .select("blocked_date")
    .eq("business_id", businessId)
    .gte("blocked_date", from)
    .lte("blocked_date", to);

  if (error) {
    console.error("blocked-days public API:", error.message);
    // Не чупим UI-то — връщаме празен списък при грешка.
    return NextResponse.json({ dates: [] });
  }

  const dates = (data ?? []).map((r) => r.blocked_date);

  return NextResponse.json({ dates });
}
