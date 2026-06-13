"use client";

import { useEffect } from "react";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  status: "confirmed" | "pending";
  service_name: string;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onCancel: () => void;
  isBusy: boolean;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function formatDateBG(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingDetailsModal({
  booking,
  onClose,
  onCancel,
  isBusy,
}: Props) {
  // Затваряне с Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#2E2E2E] bg-[#161616] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-semibold text-[#EDE8E0]">
            Детайли за резервация
          </h3>
          <button
            onClick={onClose}
            className="text-[#7A7570] hover:text-[#EDE8E0] transition-colors"
            aria-label="Затвори"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
            <span className="text-[#7A7570]">Клиент</span>
            <span className="text-[#EDE8E0] font-medium">{booking.customer_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
            <span className="text-[#7A7570]">Услуга</span>
            <span className="text-[#EDE8E0] font-medium">{booking.service_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
            <span className="text-[#7A7570]">Дата</span>
            <span className="text-[#EDE8E0] font-medium capitalize">
              {formatDateBG(booking.booking_date)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
            <span className="text-[#7A7570]">Час</span>
            <span className="text-[#EDE8E0] font-bold text-base">
              {formatTime(booking.start_time)} — {formatTime(booking.end_time)}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[#7A7570]">Статус</span>
            <span
              className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                booking.status === "confirmed"
                  ? "bg-green-950/40 text-green-300 border-green-900/40"
                  : "bg-yellow-950/40 text-yellow-300 border-yellow-900/40"
              }`}
            >
              {booking.status === "confirmed" ? "Потвърден" : "Изчаква"}
            </span>
          </div>
          <p className="text-[11px] text-[#555] pt-2">
            Контактните данни на клиента са видими в раздел &quot;Часове&quot;.
          </p>
        </div>

        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#2E2E2E] text-[#C8C3B8] hover:bg-[#222] disabled:opacity-50 text-sm font-medium transition-all"
          >
            Затвори
          </button>
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-950/40 text-red-300 border border-red-900/40 hover:bg-red-950/60 disabled:opacity-50 text-sm font-medium transition-all"
          >
            {isBusy ? "Отменяне..." : "Отмени часа"}
          </button>
        </div>
      </div>
    </div>
  );
}
