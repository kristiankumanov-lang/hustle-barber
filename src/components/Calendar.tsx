"use client";

import { useMemo, useState } from "react";
import { WorkingHoursRow } from "@/lib/types";
import {
  getUpcomingDays,
  toDateString,
  formatDayShort,
  isWorkingDay,
} from "@/lib/slots";

interface Props {
  workingHours: WorkingHoursRow[];
  selected: string;
  onSelect: (dateStr: string) => void;
  /** Списък с блокирани бъдещи дни ("YYYY-MM-DD"). Показват се като почивка. */
  blockedDays?: string[];
}

const TOTAL_DAYS = 28; // 4 седмици напред
const PAGE_SIZE = 7; // показваме 7 дни на страница

export default function Calendar({
  workingHours,
  selected,
  onSelect,
  blockedDays = [],
}: Props) {
  const allDays = useMemo(() => getUpcomingDays(TOTAL_DAYS), []);
  const blockedSet = useMemo(() => new Set(blockedDays), [blockedDays]);

  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allDays.length / PAGE_SIZE);

  const pageStart = page * PAGE_SIZE;
  const visibleDays = allDays.slice(pageStart, pageStart + PAGE_SIZE);

  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  // Етикет за периода (примерно "15 — 21 юни" или "29 юни — 5 юли")
  const periodLabel = useMemo(() => {
    if (visibleDays.length === 0) return "";
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];
    const f = formatDayShort(first);
    const l = formatDayShort(last);
    if (f.month === l.month) {
      return `${f.dayNum} — ${l.dayNum} ${f.month}`;
    }
    return `${f.dayNum} ${f.month} — ${l.dayNum} ${l.month}`;
  }, [visibleDays]);

  return (
    <section>
      <div className="step-heading">
        <span className="step-num">2</span>
        <span className="step-title">Избери ден</span>
      </div>

      {/* Header с период + стрелки */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={!canGoBack}
          aria-label="Назад"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] text-[#C8C3B8] hover:bg-[#262626] hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-sm font-medium text-[#C8C3B8] capitalize text-center px-3">
          {periodLabel}
        </div>

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={!canGoForward}
          aria-label="Напред"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] text-[#C8C3B8] hover:bg-[#262626] hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {visibleDays.map((date) => {
          const dateStr = toDateString(date);
          const { dayName, dayNum, month } = formatDayShort(date);
          const isWorking = isWorkingDay(date, workingHours);
          const isBlocked = blockedSet.has(dateStr);
          const isAvailable = isWorking && !isBlocked;
          const isActive = selected === dateStr;
          const isSunday = date.getDay() === 0;

          // Малка етикетна линия отдолу: "почивка" за неработни/блокирани
          const showOffLabel = !isWorking || isBlocked;
          const offLabel = isSunday && !isBlocked ? "почивка" : "почивка";

          return (
            <button
              key={dateStr}
              disabled={!isAvailable}
              onClick={() => onSelect(dateStr)}
              className={`
                flex flex-col items-center min-w-[4rem] py-3 px-2 rounded-xl
                border transition-all duration-150 shrink-0
                ${
                  !isAvailable
                    ? "border-[#222] bg-[#181818] text-[#383838] cursor-not-allowed"
                    : isActive
                    ? "border-[#F0EBE3] bg-[#F0EBE3] text-[#111111] shadow-sm"
                    : "border-[#2E2E2E] bg-[#222] text-[#C8C3B8] hover:border-[#444] hover:bg-[#262626] cursor-pointer"
                }
              `}
            >
              <span
                className={`text-[10px] uppercase tracking-widest font-medium ${
                  isActive
                    ? "text-[#111]/60"
                    : !isAvailable
                    ? "text-[#383838]"
                    : "text-[#555]"
                }`}
              >
                {dayName}
              </span>
              <span className="text-lg font-bold mt-0.5 leading-none">{dayNum}</span>
              <span
                className={`text-[10px] mt-1 ${
                  isActive ? "text-[#111]/50" : "text-[#555]"
                }`}
              >
                {month}
              </span>
              {showOffLabel && (
                <span
                  className={`text-[9px] mt-1 tracking-wide ${
                    isActive ? "text-[#111]/40" : "text-[#383838]"
                  }`}
                >
                  {offLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
