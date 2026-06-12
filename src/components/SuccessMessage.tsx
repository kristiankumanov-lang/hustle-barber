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
          {/* Зелена checkmark — часът е запазен веднага, не "чакаме потвърждение" */}
          <div className="relative w-14 h-14 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#F0EBE3]/5 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-[#F0EBE3] flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l5 5L20 7.5" />
              </svg>
            </div>
          </div>

          <h2
            className="text-2xl font-semibold text-[#F0EBE3] mb-3"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Часът ви е запазен!
          </h2>

          <p className="max-w-sm mx-auto text-sm leading-relaxed text-[#8B8580] mb-5">
            Очакваме ви в Hustle Barber. Ако нещо изскочи и не можете да дойдете,
            моля обадете се навреме.
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

          {/* OPTIONAL: Telegram reminder opt-in.
              НЕ е необходимо за резервацията — просто връзва chat_id с booking-а,
              за да получи клиентът напомняне 1 час преди часа. */}
          {result.telegramReminderUrl && (
            <div className="max-w-xs mx-auto mb-6">
              <a
                href={result.telegramReminderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl border border-[#2E2E2E] bg-[#181818] hover:bg-[#1F1F1F] hover:border-[#3A3A3A] text-[#C8C3B8] hover:text-[#EDE8E0] transition-all text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16-1.86 8.79c-.14.622-.51.775-1.034.482l-2.86-2.106-1.38 1.327c-.152.152-.28.28-.574.28l.205-2.913 5.305-4.793c.232-.205-.05-.32-.358-.114l-6.553 4.127-2.825-.882c-.614-.193-.628-.614.128-.91l11.024-4.25c.512-.193.96.114.79.872z"/>
                </svg>
                Получи напомняне в Telegram
              </a>
              <p className="text-[11px] text-[#555] mt-2">
                По избор. Ще ти напомним 1 час преди часа.
              </p>
            </div>
          )}
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
