/**
 * GET /api/services-public?business_id=...
 *
 * Връща списък с услугите на бизнеса. Публичен endpoint —
 * клиентската страница вече ползва Supabase директно (RLS публичен),
 * ама admin формите ще го предпочитат за consistency.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FALLBACK_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id") ?? FALLBACK_BUSINESS_ID;

  const { data, error } = await supabaseServer
    .from("services")
    .select("id, name, duration_minutes")
    .eq("business_id", businessId)
    .order("duration_minutes", { ascending: true });

  if (error) {
    console.error("services-public API:", error.message);
    return NextResponse.json({ services: [] });
  }

  // Скриваме "друго" услугата (както главната страница прави).
  const services = (data ?? []).filter((s) => s.name.toLowerCase() !== "друго");

  return NextResponse.json({ services });
}
