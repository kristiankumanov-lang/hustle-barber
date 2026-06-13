"use client";

import { useEffect, useState, useCallback } from "react";

type BookingStatus = "pending" | "confirmed" | "expired" | "cancelled";

interface AdminBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: BookingStatus;
  confirmed_at: string | null;
  cancelled_at: string | null;
  service_name: string;
  duration_minutes: number | null;
}

type Tab = "today" | "week" | "history";

function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysSofia(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateBG(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

const STATUS_LABELS: Record<BookingStatus, { label: string; cls: string }> = {
  confirmed: {
    label: "Потвърден",
    cls: "bg-green-950/40 text-green-300 border-green-900/40",
  },
  pending: {
    label: "Изчаква",
    cls: "bg-yellow-950/40 text-yellow-300 border-yellow-900/40",
  },
  cancelled: {
    label: "Отменен",
    cls: "bg-red-950/40 text-red-300 border-red-900/40",
  },
  expired: {
    label: "Изтекъл",
    cls: "bg-[#1E1E1E] text-[#555] border-[#2A2A2A]",
  },
};

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("today");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async (currentTab: Tab) => {
    setIsLoading(true);
    setError("");

    const today = todaySofia();
    let from = today;
    let to = today;

    if (currentTab === "today") {
      from = today;
      to = today;
    } else if (currentTab === "week") {
      from = today;
      to = addDaysSofia(today, 7);
    } else {
      from = addDaysSofia(today, -90);
      to = addDaysSofia(today, -1);
    }

    try {
      const res = await fetch(
        `/api/admin/bookings?from=${from}&to=${to}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Грешка");
      }
      setBookings(json.bookings ?? []);
    } catch (e) {
      console.error(e);
      setError("Не успях да заредя резервациите.");
      setBookings([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBookings(tab);
  }, [tab, loadBookings]);

  async function handleCancel(bookingId: string) {
    if (!confirm("Сигурен ли си, че искаш да отмениш този час?")) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch("/api/admin/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.message ?? "Грешка при отмяна.");
      } else {
        await loadBookings(tab);
      }
    } catch {
      alert("Мрежова грешка. Опитай пак.");
    }
    setCancellingId(null);
  }

  const grouped = bookings.reduce<Record<string, AdminBooking[]>>((acc, b) => {
    (acc[b.booking_date] ??= []).push(b);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    return tab === "history" ? b.localeCompare(a) : a.localeCompare(b);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2A2A2A]">
        {(
          [
            { key: "today", label: "Днес" },
            { key: "week", label: "Седмица" },
            { key: "history", label: "История" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-[#EDE8E0] text-[#EDE8E0]"
                : "border-transparent text-[#7A7570] hover:text-[#C8C3B8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7A7570] text-sm">
          Зареждам...
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={() => loadBookings(tab)}
            className="text-xs text-[#EDE8E0] hover:underline"
          >
            Опитай отново
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center text-[#7A7570] text-sm">
          Няма резервации за този период.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-xs uppercase tracking-widest text-[#7A7570] mb-2 px-1">
                {formatDateBG(date)}
                <span className="ml-2 text-[#4A4845]">
                  ({grouped[date].length})
                </span>
              </h3>
              <div className="space-y-2">
                {grouped[date].map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-lg font-bold text-[#EDE8E0]"
                            style={{
                              fontFamily: "var(--font-serif), Georgia, serif",
                            }}
                          >
                            {formatTime(b.start_time)} —{" "}
                            {formatTime(b.end_time)}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              STATUS_LABELS[b.status]?.cls ?? ""
                            }`}
                          >
                            {STATUS_LABELS[b.status]?.label ?? b.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#C8C3B8] mt-1">
                          {b.service_name}
                        </p>
                      </div>

                      {(b.status === "confirmed" || b.status === "pending") && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-900/40 hover:border-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {cancellingId === b.id ? "Отменяне..." : "Отмени"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                      <div>
                        <span className="text-[#555] uppercase tracking-wider text-[10px]">
                          Клиент
                        </span>
                        <p className="text-[#C8C3B8] mt-0.5">
                          {b.customer_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#555] uppercase tracking-wider text-[10px]">
                          Телефон
                        </span>
                        <p className="text-[#C8C3B8] mt-0.5">
                          {b.customer_phone ? (
                            <a
                              href={`tel:${b.customer_phone}`}
                              className="hover:text-[#EDE8E0]"
                            >
                              {b.customer_phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[#555] uppercase tracking-wider text-[10px]">
                          Имейл
                        </span>
                        <p className="text-[#C8C3B8] mt-0.5 truncate">
                          {b.customer_email ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}