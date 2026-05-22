/**
 * GET /api/reminders
 * Извиква се от Supabase pg_cron на всеки ~10 минути.
 * Намира потвърдени часове, които започват след ~1 час и още нямат пратен
 * reminder, праща Telegram напомняне и маркира reminder_sent_at.
 *
 * Защита: иска ?secret=<CRON_SECRET> (или Authorization: Bearer <CRON_SECRET>),
 * за да не може всеки да блъска route-а и да спами клиентите.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Прозорец напред: часове между +REMINDER_MIN_AHEAD и +REMINDER_MAX_AHEAD минути.
// MAX трябва да е поне с интервала на cron-а по-голям от MIN, за да не се
// "провре" час между две извиквания (cron на 10 мин → 10 мин буфер).
const REMINDER_MIN_AHEAD = 60; // 1 час преди
const REMINDER_MAX_AHEAD = 70; // + буфер за 10-минутния cron

// Часовете в базата са в българско време. Изчисляваме отместването на
// Europe/Sofia спрямо UTC за конкретен момент (лято +3, зима +2).
function sofiaOffsetMinutes(at: Date): number {
  // "en-US" с timeZone ни дава локалното време в София; разликата спрямо
  // UTC компонентите е отместването.
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = tz.formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  );

  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Превръща booking_date + start_time (българско време) в реален UTC момент. */
function bookingStartUtc(bookingDate: string, startTime: string): Date {
  const [y, mo, d] = bookingDate.split("-").map(Number);
  const [h, mi] = startTime.slice(0, 5).split(":").map(Number);

  // Първо приемаме, че компонентите са UTC, после изваждаме отместването
  // на София, за да получим истинския UTC момент.
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = sofiaOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offset * 60000);
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function buildReminderText(serviceName: string, startTime: string): string {
  return [
    "⏰ Напомняне за час",
    "",
    `След около час те очакваме в Hustle Barber 💈`,
    "",
    `Услуга: ${serviceName}`,
    `Час: ${formatTime(startTime)}`,
    "",
    "До скоро!",
  ].join("\n");
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // без конфигуриран secret → не пускаме

  const urlSecret = request.nextUrl.searchParams.get("secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  return urlSecret === secret || bearer === secret;
}

async function runReminders() {
  const now = new Date();

  // Кои дати ни интересуват — днес и утре (час +1ч може да прехвърли полунощ).
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);

  const { data: bookings, error } = await supabaseServer
    .from("bookings")
    .select(
      "id, service_id, booking_date, start_time, telegram_chat_id, reminder_sent_at, status"
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .not("telegram_chat_id", "is", null)
    .in("booking_date", [todayStr, tomorrowStr]);

  if (error) {
    console.error("Reminders: грешка при заявка:", error.message);
    return { sent: 0, checked: 0, error: error.message };
  }

  let sent = 0;
  const checked = bookings?.length ?? 0;

  for (const b of bookings ?? []) {
    const startUtc = bookingStartUtc(b.booking_date, b.start_time);
    const minutesAhead = Math.round((startUtc.getTime() - now.getTime()) / 60000);

    if (minutesAhead < REMINDER_MIN_AHEAD || minutesAhead > REMINDER_MAX_AHEAD) {
      continue; // още не е време, или вече е минал прозорецът
    }

    // Вземи името на услугата
    const { data: svc } = await supabaseServer
      .from("services")
      .select("name")
      .eq("id", b.service_id)
      .maybeSingle();
    const serviceName = svc?.name ?? "Избрана услуга";

    // Маркирай ПЪРВО (атомарно срещу двойно пращане), после прати.
    const { data: claimed, error: claimErr } = await supabaseServer
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null) // само ако още не е маркиран
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      continue; // друг процес го е хванал, или грешка → пропусни
    }

    try {
      await sendTelegramMessage(
        Number(b.telegram_chat_id),
        buildReminderText(serviceName, b.start_time)
      );
      sent++;
    } catch (e) {
      console.error("Reminders: грешка при Telegram изпращане:", e);
      // Връщаме reminder_sent_at към NULL, за да опита пак следващия cron.
      await supabaseServer
        .from("bookings")
        .update({ reminder_sent_at: null })
        .eq("id", b.id);
    }
  }

  return { sent, checked };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}

// pg_cron през pg_net праща POST по подразбиране — поддържаме и двата метода.
export async function POST(request: NextRequest) {
  return GET(request);
}
