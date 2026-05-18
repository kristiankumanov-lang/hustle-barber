"use client";
import { BookingResult } from "@/lib/types";

interface Props {
  result: BookingResult;
  onReset: () => void;
  serviceName?: string;
  date?: string;
  time?: string;
}

export default function SuccessMessage({ result, onReset, serviceName, date, time }: Props) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString("bg-BG", {
        weekday: "long", day: "numeric", month: "long",
      })
    : "";

  return (
    <section className="text-center py-6">
      {result.success ? (
        <>
          <div className="relative w-14 h-14 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#F0EBE3]/5 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-[#F0EBE3] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-[#F0EBE3] mb-4"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
            Часът е запазен!
          </h2>

          {/* Booking summary */}
          {(serviceName || date || time) && (
            <div className="rounded-xl border border-[#2E2E2E] bg-[#181818] p-4 mb-5 text-left max-w-xs mx-auto">
              {serviceName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#2A2A2A]">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Услуга</span>
                  <span className="text-sm font-medium text-[#C8C3B8]">{serviceName}</span>
                </div>
              )}
              {date && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#2A2A2A]">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Дата</span>
                  <span className="text-sm font-medium text-[#C8C3B8] capitalize">{formattedDate}</span>
                </div>
              )}
              {time && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Час</span>
                  <span className="text-xl font-bold text-[#F0EBE3]"
                        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{time}</span>
                </div>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-2 mb-8">
            <div className="h-px w-8 bg-[#2E2E2E]" />
            <span className="text-[11px] text-[#444] tracking-[0.25em] uppercase"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
              Очакваме ви
            </span>
            <div className="h-px w-8 bg-[#2E2E2E]" />
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#F0EBE3] mb-2"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
            Неуспешна резервация
          </h2>
          <p className="text-[#666] text-sm mb-8">{result.message}</p>
        </>
      )}
      <button onClick={onReset}
        className="px-8 py-3 rounded-xl bg-[#F0EBE3] text-[#111111] font-semibold
          hover:bg-white transition-all text-sm tracking-wide shadow-sm">
        Запази нов час
      </button>
    </section>
  );
}
