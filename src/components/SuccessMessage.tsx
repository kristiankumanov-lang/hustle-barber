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
    ? new Date(date + "T00:00:00").toLocaleDateString("bg-BG", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <section className="text-center py-6">
      {result.success ? (
        <>
          <div className="relative w-14 h-14 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#F0EBE3]/5 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-[#F0EBE3] flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
          </div>

          <h2
            className="text-2xl font-semibold text-[#F0EBE3] mb-3"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Почти готово!
          </h2>

          <p className="max-w-sm mx-auto text-sm leading-relaxed text-[#8B8580] mb-5">
            Часът ви е временно запазен за 10 минути. За да бъде потвърден,
            натиснете бутона по-долу и потвърдете резервацията в Telegram.
          </p>

          {/* Booking summary */}
          {(serviceName || date || time) && (
            <div className="rounded-xl border border-[#2E2E2E] bg-[#181818] p-4 mb-5 text-left max-w-xs mx-auto">
              {serviceName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#2A2A2A] gap-4">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Услуга</span>
                  <span className="text-sm font-medium text-[#C8C3B8] text-right">{serviceName}</span>
                </div>
              )}
              {date && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#2A2A2A] gap-4">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Дата</span>
                  <span className="text-sm font-medium text-[#C8C3B8] capitalize text-right">
                    {formattedDate}
                  </span>
                </div>
              )}
              {time && (
                <div className="flex justify-between items-center py-1.5 gap-4">
                  <span className="text-[11px] uppercase tracking-widest text-[#555]">Час</span>
                  <span
                    className="text-xl font-bold text-[#F0EBE3]"
                    style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    {time}
                  </span>
                </div>
              )}
            </div>
          )}

          {result.telegramConfirmUrl ? (
            <a
              href={result.telegramConfirmUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full max-w-xs mx-auto px-6 py-3 rounded-xl bg-[#F0EBE3] text-[#111111] font-semibold hover:bg-white transition-all text-sm tracking-wide shadow-sm mb-4"
            >
              Потвърди в Telegram
            </a>
          ) : (
            <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-3 mb-4 max-w-xs mx-auto">
              <p className="text-sm text-yellow-200/80">
                Линкът за Telegram не беше върнат от сървъра. Моля, опитайте отново.
              </p>
            </div>
          )}

          <p className="text-xs text-[#555] max-w-xs mx-auto mb-8">
            Ако не потвърдите до 10 минути, часът ще бъде освободен автоматично.
          </p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold text-[#F0EBE3] mb-2"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Неуспешна резервация
          </h2>
          <p className="text-[#666] text-sm mb-8">{result.message}</p>
        </>
      )}

      <button
        onClick={onReset}
        className="px-8 py-3 rounded-xl border border-[#333330] text-[#7A7570] hover:bg-[#2A2A2A] hover:border-[#444] hover:text-[#AAA] transition-all text-sm font-medium"
      >
        Запази нов час
      </button>
    </section>
  );
}
