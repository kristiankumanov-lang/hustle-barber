"use client";
import { WorkingHoursRow } from "@/lib/types";
import { getUpcomingDays, toDateString, formatDayShort, isWorkingDay } from "@/lib/slots";

interface Props {
  workingHours: WorkingHoursRow[];
  selected: string;
  onSelect: (dateStr: string) => void;
}

export default function Calendar({ workingHours, selected, onSelect }: Props) {
  const days = getUpcomingDays(14);

  return (
    <section>
      <div className="step-heading"><span className="step-num">2</span><span className="step-title">Избери ден</span></div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {days.map((date) => {
          const dateStr = toDateString(date);
          const { dayName, dayNum, month } = formatDayShort(date);
          const isWorking = isWorkingDay(date, workingHours);
          const isActive  = selected === dateStr;
          const isSunday  = date.getDay() === 0;

          return (
            <button
              key={dateStr}
              disabled={!isWorking}
              onClick={() => onSelect(dateStr)}
              className={`
                flex flex-col items-center min-w-[4rem] py-3 px-2 rounded-xl
                border transition-all duration-150 shrink-0
                ${!isWorking
                  ? "border-[#222] bg-[#181818] text-[#383838] cursor-not-allowed"
                  : isActive
                    ? "border-[#F0EBE3] bg-[#F0EBE3] text-[#111111] shadow-sm"
                    : "border-[#2E2E2E] bg-[#222] text-[#C8C3B8] hover:border-[#444] hover:bg-[#262626] cursor-pointer"
                }
              `}
            >
              <span className={`text-[10px] uppercase tracking-widest font-medium ${isActive ? "text-[#111]/60" : !isWorking ? "text-[#383838]" : "text-[#555]"}`}>
                {dayName}
              </span>
              <span className="text-lg font-bold mt-0.5 leading-none">{dayNum}</span>
              <span className={`text-[10px] mt-1 ${isActive ? "text-[#111]/50" : "text-[#555]"}`}>{month}</span>
              {isSunday && (
                <span className={`text-[9px] mt-1 tracking-wide ${isActive ? "text-[#111]/40" : "text-[#383838]"}`}>
                  почивка
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
