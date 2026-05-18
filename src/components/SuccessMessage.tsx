"use client";
import { BookingResult } from "@/lib/types";

interface Props {
  result: BookingResult;
  onReset: () => void;
}

export default function SuccessMessage({ result, onReset }: Props) {
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
          <h2 className="text-2xl font-semibold text-[#F0EBE3] mb-2"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
            Часът е запазен!
          </h2>
          <p className="text-[#666] text-sm mb-2">{result.message}</p>
          <div className="inline-flex items-center gap-2 mt-1 mb-8">
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
