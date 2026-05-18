"use client";
import { Service } from "@/lib/types";

interface Props {
  services: Service[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function ServiceList({ services, selected, onSelect }: Props) {
  if (services.length === 0) {
    return (
      <section>
        <div className="step-heading"><span className="step-num">1</span><span className="step-title">Избери услуга</span></div>
        <p className="text-[#555] text-sm">Няма налични услуги.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="step-heading"><span className="step-num">1</span><span className="step-title">Избери услуга</span></div>
      <div className="grid gap-2.5">
        {services.map((service) => {
          const isActive = selected === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onSelect(service.id)}
              className={`
                w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150
                ${isActive
                  ? "border-[#F0EBE3] bg-[#F0EBE3] text-[#111111] shadow-sm"
                  : "border-[#2E2E2E] bg-[#222222] text-[#C8C3B8] hover:border-[#444] hover:bg-[#262626]"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-[#111]/40" : "bg-[#3A3A3A]"}`} />
                  <span className="font-medium text-[0.9rem] tracking-wide">{service.name}</span>
                </div>
                <span className={`text-xs tracking-widest flex-shrink-0 ml-4 ${isActive ? "text-[#111]/50" : "text-[#555]"}`}>
                  {service.duration_minutes} мин
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
