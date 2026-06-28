/**
 * POST   /api/admin/block-slot   { date, start_time, end_time, reason? }
 * DELETE /api/admin/block-slot   { id: string }  (или { date, start_time })
 *
 * Toggle на отделен слот като блокиран.
 * POST вмъква в blocked_slots.
 * DELETE приема ID-то на записа (по-точно) или date+start_time.
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
function isValidTime(t: string | undefined): t is string {
  return typeof t === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(t);
}
function toDbTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    date?: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  }

  if (!isValidDate(body.date) || !isValidTime(body.start_time) || !isValidTime(body.end_time)) {
    return NextResponse.json({ ok: false, message: "Невалидни параметри." }, { status: 400 });
  }

  const startDb = toDbTime(body.start_time);
  const endDb = toDbTime(body.end_time);

  if (startDb >= endDb) {
    return NextResponse.json(
      { ok: false, message: "Краят трябва да е след началото." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("blocked_slots")
    .insert({
      business_id: BUSINESS_ID,
      blocked_date: body.date,
      start_time: startDb,
      end_time: endDb,
      reason: body.reason?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("block-slot POST:", error.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при блокиране на слот." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isBarberUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; date?: string; start_time?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  }

  // Вариант 1: триене по id (точно)
  if (body.id && /^[a-f0-9-]{36}$/i.test(body.id)) {
    const { error } = await supabaseServer
      .from("blocked_slots")
      .delete()
      .eq("business_id", BUSINESS_ID)
      .eq("id", body.id);

    if (error) {
      console.error("block-slot DELETE by id:", error.message);
      return NextResponse.json(
        { ok: false, message: "Грешка при разблокиране." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Вариант 2: триене по date + start_time (за UI който не помни id)
  if (!isValidDate(body.date) || !isValidTime(body.start_time)) {
    return NextResponse.json({ ok: false, message: "Невалидни параметри." }, { status: 400 });
  }

  const startDb = toDbTime(body.start_time);
  const { error } = await supabaseServer
    .from("blocked_slots")
    .delete()
    .eq("business_id", BUSINESS_ID)
    .eq("blocked_date", body.date)
    .eq("start_time", startDb);

  if (error) {
    console.error("block-slot DELETE by date/time:", error.message);
    return NextResponse.json(
      { ok: false, message: "Грешка при разблокиране." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
