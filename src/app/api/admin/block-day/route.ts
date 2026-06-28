/**
 * POST   /api/admin/block-day   { date: "YYYY-MM-DD", reason?: string }
 * DELETE /api/admin/block-day   { date: "YYYY-MM-DD" }
 *
 * Toggle на цял ден като почивка.
 * POST вмъква в blocked_days (UNIQUE business_id+date — ако вече е блокиран, върни ok).
 * DELETE маха записа.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser, isBarberUser } from "@/lib/supabase-server-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

function isValidDate(d: string | undefined): d is string {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { date?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  }

  if (!isValidDate(body.date)) {
    return NextResponse.json({ ok: false, message: "Невалидна дата." }, { status: 400 });
  }

  // Upsert: ако е вече блокиран → ok без грешка
  const { error } = await supabaseServer.from("blocked_days").upsert(
    {
      business_id: BUSINESS_ID,
      blocked_date: body.date,
      reason: body.reason?.trim() || null,
      created_by: user.id,
    },
    { onConflict: "business_id,blocked_date" }
  );

  if (error) {
    console.error("block-day POST:", error.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при блокиране." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  }

  if (!isValidDate(body.date)) {
    return NextResponse.json({ ok: false, message: "Невалидна дата." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("blocked_days")
    .delete()
    .eq("business_id", BUSINESS_ID)
    .eq("blocked_date", body.date);

  if (error) {
    console.error("block-day DELETE:", error.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при разблокиране." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
