"use client";
import { TimeSlot } from "@/lib/types";

interface Props {
  slots: TimeSlot[];
  selected: string;
  onSelect: (time: string) => void;
  isLoading?: boolean;
}

export default function TimeSlots({ slots, selected, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <section>
        <div className="step-heading"><span className="step-num">3</span><span className="step-title">Свободни часове</span></div>
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-16 rounded-lg bg-[#222] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (slots.length === 0) {
    return (
      <section>
        <div className="step-heading"><span className="step-num">3</span><span className="step-title">Свободни часове</span></div>
        <p className="text-[#555] text-sm">Избери работен ден, за да видиш свободните часове.</p>
      </section>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-[0.875rem]">
        <div className="step-heading mb-0">
          <span className="step-num">3</span>
          <span className="step-title">Свободни часове</span>
        </div>
        <span className="text-[11px] text-[#555] tracking-wide">{availableCount} свободни</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const isActive = selected === slot.time;
          return (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
              className={`
                py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-150
                ${!slot.available
                  ? "bg-[#181818] text-[#383838] line-through cursor-not-allowed border border-[#222]"
                  : isActive
                    ? "bg-[#F0EBE3] text-[#111111] shadow-sm border border-[#F0EBE3]"
                    : "bg-[#222] border border-[#2E2E2E] text-[#C8C3B8] hover:border-[#444] hover:bg-[#262626]"
                }
              `}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </section>
  );
}
