"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BookingDetailsModal from "./BookingDetailsModal";
import SlotActionModal from "./SlotActionModal";

// ─── Types ────────────────────────────────────────────────────────────────

interface BlockedDay {
  id: string;
  blocked_date: string;
  reason: string | null;
}

interface BlockedSlot {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

interface ScheduleBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  status: "confirmed" | "pending";
  service_name: string;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ScheduleData {
  blocked_days: BlockedDay[];
  blocked_slots: BlockedSlot[];
  bookings: ScheduleBooking[];
  working_hours: WorkingHour[];
}

// ─── Date helpers (Sofia time) ────────────────────────────────────────────

function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function dayOfWeek(yyyymmdd: string): number {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const DAY_NAMES = ["Нед", "Пон", "Вт", "Ср", "Чет", "Пет", "Съб"];
const MONTH_NAMES = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];

function formatDayShort(yyyymmdd: string): { day: string; num: number; mon: string } {
  const [, m, d] = yyyymmdd.split("-").map(Number);
  return {
    day: DAY_NAMES[dayOfWeek(yyyymmdd)],
    num: d,
    mon: MONTH_NAMES[m - 1],
  };
}

function generateDaySlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (let t = startMin; t < endMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

function isSlotInRange(slot: string, rangeStart: string, rangeEnd: string): boolean {
  const s = slot;
  return s >= rangeStart.slice(0, 5) && s < rangeEnd.slice(0, 5);
}

// ─── Main component ───────────────────────────────────────────────────────

const TOTAL_WEEKS = 4;

export default function ScheduleClient() {
  const today = useMemo(() => todaySofia(), []);

  const currentMonday = useMemo(() => {
    const dow = dayOfWeek(today);
    const daysBack = dow === 0 ? 6 : dow - 1;
    return addDays(today, -daysBack);
  }, [today]);

  const [weekIdx, setWeekIdx] = useState(0);
  const [data, setData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeBooking, setActiveBooking] = useState<ScheduleBooking | null>(null);
  const [actionSlot, setActionSlot] = useState<{ date: string; time: string } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const weekStart = useMemo(() => addDays(currentMonday, weekIdx * 7), [currentMonday, weekIdx]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const weekDays = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/schedule?from=${weekStart}&to=${weekEnd}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Грешка");
      setData(json);
      if (selectedDate < weekStart || selectedDate > weekEnd) {
        setSelectedDate(weekStart);
      }
    } catch (e) {
      console.error(e);
      setError("Грешка при зареждане на графика.");
      setData(null);
    }
    setIsLoading(false);
  }, [weekStart, weekEnd, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Helpers ────────────────────────────────────────────────────────────

  function isDayBlocked(date: string): boolean {
    return !!data?.blocked_days.some((d) => d.blocked_date === date);
  }

  function isDayWorking(date: string): boolean {
    const dow = dayOfWeek(date);
    return !!data?.working_hours.some((wh) => wh.day_of_week === dow);
  }

  function bookingsForDay(date: string): ScheduleBooking[] {
    return data?.bookings.filter((b) => b.booking_date === date) ?? [];
  }

  function blockedSlotsForDay(date: string): BlockedSlot[] {
    return data?.blocked_slots.filter((b) => b.blocked_date === date) ?? [];
  }

  function workingHoursForDay(date: string): WorkingHour | null {
    const dow = dayOfWeek(date);
    return data?.working_hours.find((wh) => wh.day_of_week === dow) ?? null;
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  async function toggleDayBlock(date: string) {
    if (busyAction) return;
    setBusyAction(true);

    const isBlocked = isDayBlocked(date);
    try {
      const res = await fetch("/api/admin/block-day", {
        method: isBlocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.message ?? "Грешка.");
      } else {
        await loadData();
      }
    } catch {
      alert("Мрежова грешка.");
    }
    setBusyAction(false);
  }

  /**
   * Блокирай конкретен 30-мин слот. Викан от SlotActionModal или директно
   * при клик на блокиран слот (за разблокиране).
   */
  async function blockSlot(date: string, slotTime: string) {
    if (busyAction) return;
    setBusyAction(true);

    const [h, m] = slotTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + 30;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    try {
      const res = await fetch("/api/admin/block-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, start_time: slotTime, end_time: endTime }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.message ?? "Грешка.");
      } else {
        await loadData();
      }
    } catch {
      alert("Мрежова грешка.");
    }
    setBusyAction(false);
  }

  async function unblockSlot(blockedSlotId: string) {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/admin/block-slot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blockedSlotId }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.message ?? "Грешка.");
      } else {
        await loadData();
      }
    } catch {
      alert("Мрежова грешка.");
    }
    setBusyAction(false);
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Сигурен ли си, че искаш да отмениш този час?")) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/admin/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.message ?? "Грешка.");
      } else {
        setActiveBooking(null);
        await loadData();
      }
    } catch {
      alert("Мрежова грешка.");
    }
    setBusyAction(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const wh = workingHoursForDay(selectedDate);
  const selDayBlocked = isDayBlocked(selectedDate);
  const selDayWorking = isDayWorking(selectedDate);

  const daySlots = useMemo(() => {
    if (!wh) return [];
    return generateDaySlots(wh.start_time, wh.end_time);
  }, [wh]);

  const periodLabel = useMemo(() => {
    const f = formatDayShort(weekStart);
    const l = formatDayShort(weekEnd);
    if (f.mon === l.mon) return `${f.num} — ${l.num} ${f.mon}`;
    return `${f.num} ${f.mon} — ${l.num} ${l.mon}`;
  }, [weekStart, weekEnd]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
          disabled={weekIdx === 0 || isLoading}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] text-[#C8C3B8] hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Предишна седмица"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#EDE8E0]">{periodLabel}</h1>
          <p className="text-xs text-[#7A7570]">
            Седмица {weekIdx + 1} от {TOTAL_WEEKS}
          </p>
        </div>

        <button
          onClick={() => setWeekIdx((i) => Math.min(TOTAL_WEEKS - 1, i + 1))}
          disabled={weekIdx === TOTAL_WEEKS - 1 || isLoading}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] text-[#C8C3B8] hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Следваща седмица"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day tabs */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6">
        {weekDays.map((date) => {
          const isActive = date === selectedDate;
          const blocked = isDayBlocked(date);
          const working = isDayWorking(date);
          const dayBookings = bookingsForDay(date);
          const dayBlockedSlots = blockedSlotsForDay(date);
          const f = formatDayShort(date);
          const isPast = date < today;

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              disabled={isPast}
              className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-all ${
                isActive
                  ? "border-[#EDE8E0] bg-[#EDE8E0] text-[#111]"
                  : blocked
                  ? "border-red-900/40 bg-red-950/20 text-red-300"
                  : !working
                  ? "border-[#222] bg-[#181818] text-[#383838]"
                  : isPast
                  ? "border-[#222] bg-[#181818] text-[#444] cursor-not-allowed"
                  : "border-[#2E2E2E] bg-[#1A1A1A] text-[#C8C3B8] hover:bg-[#222]"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">{f.day}</span>
              <span className="text-base font-bold mt-0.5">{f.num}</span>
              <span className="text-[9px] opacity-70 mt-0.5">{f.mon}</span>

              <div className="flex items-center gap-0.5 mt-1.5 h-1.5">
                {dayBookings.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#111]" : "bg-yellow-400"}`}
                    title={`${dayBookings.length} резервации`}
                  />
                )}
                {dayBlockedSlots.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#111]" : "bg-red-400"}`}
                    title={`${dayBlockedSlots.length} блокирани`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/30 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-[#7A7570] text-sm">Зареждам...</div>
      ) : (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2
                className="text-xl font-semibold text-[#EDE8E0] capitalize"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                {(() => {
                  const f = formatDayShort(selectedDate);
                  return `${f.day}, ${f.num} ${f.mon}`;
                })()}
              </h2>
              <p className="text-xs text-[#7A7570] mt-0.5">
                {!selDayWorking
                  ? "Неработен ден (от работното време)"
                  : selDayBlocked
                  ? "Целият ден е блокиран"
                  : `${bookingsForDay(selectedDate).length} резервации, ${blockedSlotsForDay(selectedDate).length} блокирани`}
              </p>
            </div>

            {selDayWorking && (
              <button
                onClick={() => toggleDayBlock(selectedDate)}
                disabled={busyAction}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                  selDayBlocked
                    ? "bg-green-950/40 text-green-300 border border-green-900/40 hover:bg-green-950/60"
                    : "bg-red-950/40 text-red-300 border border-red-900/40 hover:bg-red-950/60"
                }`}
              >
                {selDayBlocked ? "Отблокирай деня" : "Маркирай като почивка"}
              </button>
            )}
          </div>

          {!selDayWorking ? (
            <div className="py-8 text-center text-[#7A7570] text-sm">
              В този ден не се работи (от работното време).
            </div>
          ) : selDayBlocked ? (
            <div className="py-8 text-center text-[#7A7570] text-sm">
              Целият ден е маркиран като почивка. Клиентите няма да виждат свободни часове.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {daySlots.map((slot) => {
                const booking = bookingsForDay(selectedDate).find(
                  (b) => b.start_time.slice(0, 5) === slot
                );
                const isInBooking = bookingsForDay(selectedDate).find((b) =>
                  isSlotInRange(slot, b.start_time, b.end_time)
                );
                const blockedSlot = blockedSlotsForDay(selectedDate).find((b) =>
                  isSlotInRange(slot, b.start_time, b.end_time)
                );

                let cls = "border-[#2E2E2E] bg-[#1E1E1E] text-[#C8C3B8] hover:bg-[#252525] cursor-pointer";
                let label = "";
                let onClick: (() => void) | undefined = () =>
                  setActionSlot({ date: selectedDate, time: slot });

                if (booking) {
                  cls = "border-yellow-900/40 bg-yellow-950/30 text-yellow-200 cursor-pointer hover:bg-yellow-950/50";
                  label = booking.customer_name;
                  onClick = () => setActiveBooking(booking);
                } else if (isInBooking) {
                  cls = "border-yellow-900/30 bg-yellow-950/20 text-yellow-200/60 cursor-not-allowed";
                  label = "···";
                  onClick = undefined;
                } else if (blockedSlot) {
                  cls = "border-red-900/40 bg-red-950/30 text-red-300 cursor-pointer hover:bg-red-950/50";
                  label = blockedSlot.reason ?? "Блокиран";
                  // Директно разблокиране (бутонът за блокиране минава през modal-а)
                  onClick = () => unblockSlot(blockedSlot.id);
                }

                return (
                  <button
                    key={slot}
                    onClick={onClick}
                    disabled={busyAction || onClick === undefined}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all disabled:opacity-60 ${cls}`}
                  >
                    <span className="text-sm font-bold leading-none">{slot}</span>
                    {label && (
                      <span className="text-[10px] mt-1 truncate w-full opacity-80">{label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-[#7A7570]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-[#2E2E2E] bg-[#1E1E1E]" />
              <span>Свободен</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-yellow-900/40 bg-yellow-950/30" />
              <span>Резервация</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-red-900/40 bg-red-950/30" />
              <span>Блокиран</span>
            </div>
            <div className="ml-auto text-[#555]">
              Цъкни свободен слот за резервация или блокиране
            </div>
          </div>
        </div>
      )}

      {/* Modal за booking детайли (при click на резервация) */}
      {activeBooking && (
        <BookingDetailsModal
          booking={activeBooking}
          onClose={() => setActiveBooking(null)}
          onCancel={() => handleCancelBooking(activeBooking.id)}
          isBusy={busyAction}
        />
      )}

      {/* Modal с избор: запази час или блокирай (при click на свободен слот) */}
      {actionSlot && (
        <SlotActionModal
          date={actionSlot.date}
          startTime={actionSlot.time}
          onClose={() => setActionSlot(null)}
          onBlock={() => {
            blockSlot(actionSlot.date, actionSlot.time);
          }}
          onBookingCreated={async () => {
            setActionSlot(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
