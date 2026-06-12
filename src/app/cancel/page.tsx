/**
 * /cancel?token=...
 *
 * Server component. Чете cancel_token от URL, fetch-ва booking-а от Supabase
 * и показва confirmation страница с бутон "Да, отмени часа".
 *
 * Реалната отмяна става със CLIENT-side POST към /api/cancel, не на GET тук.
 * Това пази от email scanner-и (Outlook Safe Links, Gmail preview) които
 * автоматично отварят линкове и биха отменили часа без барберът да е цъкал.
 */

import { supabaseServer } from "@/lib/supabase-server";
import CancelConfirmButton from "./CancelConfirmButton";

export const dynamic = "force-dynamic";

function sofiaOffsetMinutes(at: Date): number {
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

function bookingStartUtc(bookingDate: string, startTime: string): Date {
  const [y, mo, d] = bookingDate.split("-").map(Number);
  const [h, mi] = startTime.slice(0, 5).split(":").map(Number);
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = sofiaOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offset * 60000);
}

function formatDateBG(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const containerStyle = "min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a] text-[#F0EBE3]";
const cardStyle = "w-full max-w-md p-8 rounded-2xl border border-[#2E2E2E] bg-[#161616] shadow-xl";
const titleStyle = "text-2xl font-semibold mb-2";
const subtleStyle = "text-sm text-[#A8A39A] mb-6";
const rowStyle = "flex justify-between py-2 border-b border-[#2A2A2A] text-sm";
const rowLabelStyle = "text-[#888]";
const rowValueStyle = "text-[#F0EBE3] font-medium";

type SearchParams = { token?: string };

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await searchParams;

  if (!token || !/^[A-Za-z0-9-]{8,64}$/.test(token)) {
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <h1 className={titleStyle}>Невалиден линк</h1>
          <p className={subtleStyle}>Линкът за отмяна не е валиден или е непълен.</p>
        </div>
      </div>
    );
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, booking_date, start_time, end_time, customer_name, customer_phone, status")
    .eq("cancel_token", token)
    .maybeSingle();

  if (!booking) {
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <h1 className={titleStyle}>Невалиден линк</h1>
          <p className={subtleStyle}>Линкът за отмяна не съществува или вече е изтрит.</p>
        </div>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <h1 className={titleStyle}>Часът вече е отменен</h1>
          <p className={subtleStyle}>
            Тази резервация беше отменена. Слотът е свободен.
          </p>
        </div>
      </div>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <h1 className={titleStyle}>Не може да бъде отменен</h1>
          <p className={subtleStyle}>
            Статус на резервацията: {booking.status}. Линкът не позволява отмяна.
          </p>
        </div>
      </div>
    );
  }

  const startUtc = bookingStartUtc(booking.booking_date, booking.start_time);
  if (startUtc.getTime() <= Date.now()) {
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <h1 className={titleStyle}>Линкът е изтекъл</h1>
          <p className={subtleStyle}>
            Часът вече е минал. Не може да бъде отменен през този линк.
          </p>
        </div>
      </div>
    );
  }

  const st = booking.start_time.slice(0, 5);
  const et = booking.end_time.slice(0, 5);

  return (
    <div className={containerStyle}>
      <div className={cardStyle}>
        <h1 className={titleStyle}>Отмяна на резервация</h1>
        <p className={subtleStyle}>Сигурен ли си, че искаш да отмениш този час?</p>

        <div className="mb-6">
          <div className={rowStyle}>
            <span className={rowLabelStyle}>Клиент</span>
            <span className={rowValueStyle}>{booking.customer_name}</span>
          </div>
          <div className={rowStyle}>
            <span className={rowLabelStyle}>Телефон</span>
            <span className={rowValueStyle}>{booking.customer_phone}</span>
          </div>
          <div className={rowStyle}>
            <span className={rowLabelStyle}>Дата</span>
            <span className={rowValueStyle}>{formatDateBG(booking.booking_date)}</span>
          </div>
          <div className={rowStyle}>
            <span className={rowLabelStyle}>Час</span>
            <span className={rowValueStyle}>{st} — {et}</span>
          </div>
        </div>

        <CancelConfirmButton token={token} />
      </div>
    </div>
  );
}
