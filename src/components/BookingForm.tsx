"use client";
import { useState } from "react";
import { Service, BookingResult } from "@/lib/types";
import { getServiceById } from "@/lib/services";

interface Props {
  services: Service[];
  serviceId: string;
  date: string;
  time: string;
  isSubmitting: boolean;
  serverResult: BookingResult | null;
  onSubmit: (data: { name: string; email: string; phone?: string }) => void;
  onBack: () => void;
}

export default function BookingForm({
  services, serviceId, date, time,
  isSubmitting, serverResult, onSubmit, onBack,
}: Props) {
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");   // РЕД 2
  const [email, setEmail] = useState("");   // РЕД 3
  const [error, setError] = useState("");

  const service = getServiceById(services, serviceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Само name е required
    if (!name.trim()) {
      setError("Моля, въведете вашето име.");
      return;
    }
    // Email се валидира само ако е попълнен
    if (email.trim() && !email.includes("@")) {
      setError("Моля, въведете валиден имейл адрес.");
      return;
    }

    onSubmit({
      name:  name.trim(),
      email: email.trim(),         // може да е "" — backend го приема
      phone: phone.trim() || undefined,
    });
  }

const formattedDate = date
  ? new Date(date + "T00:00:00").toLocaleDateString("bg-BG", {
      weekday: "long", day: "numeric", month: "long",
    })
  : "";

  const inputClass = `
    w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A]
    text-[#EDE8E0] text-sm placeholder:text-[#4A4845]
    focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555]
    transition-all duration-150
  `;
  const labelClass = "block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase";
  const optionalTag = (
    <span className="text-[#4A4845] normal-case tracking-normal font-normal"> (по избор)</span>
  );

  return (
    <section>
      <div className="step-heading">
        <span className="step-num">4</span>
        <span className="step-title">Вашите данни</span>
      </div>

      {/* Booking summary */}
      <div className="rounded-xl border border-[#333330] bg-[#1E1E1E] p-4 mb-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">Услуга</p>
            <p className="text-sm font-semibold text-[#C8C3B8] leading-tight">{service?.name}</p>
          </div>
          <div className="border-x border-[#333330]">
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">Дата</p>
            <p className="text-sm font-semibold text-[#C8C3B8] leading-tight capitalize">{formattedDate}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">Час</p>
            <p className="text-[1.3rem] font-bold text-[#EDE8E0] leading-tight"
               style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{time}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 1. Име— required */}
        <div>
          <label htmlFor="name" className={labelClass}>
            Име <span className="text-[#EDE8E0]/50 normal-case tracking-normal">*</span>
          </label>
          <input id="name" type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Вашето пълно име" className={inputClass} />
        </div>

        {/* 2. Телефон — optional */}
        <div>
          <label htmlFor="phone" className={labelClass}>
            Телефон{optionalTag}
          </label>
          <input id="phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+359 88 ..." className={inputClass} />
        </div>

        {/* 3. Имейл — optional */}
        <div>
          <label htmlFor="email" className={labelClass}>
            Имейл{optionalTag}
          </label>
          <input id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className={inputClass} />
        </div>

        {(error || (serverResult && !serverResult.success)) && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-900/40 bg-red-950/30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-red-400">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-red-400">{error || serverResult?.message}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onBack}
            className="px-5 py-3 rounded-xl border border-[#333330] text-[#7A7570]
              hover:bg-[#2A2A2A] hover:border-[#444] hover:text-[#AAA]
              transition-all text-sm font-medium">
            ← Назад
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-[#EDE8E0] text-[#111111] font-semibold
              hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed
              transition-all text-sm tracking-wide shadow-sm">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#111" strokeWidth="3" strokeOpacity="0.2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Запазване...
              </span>
            ) : "Запази час"}
          </button>
        </div>
      </form>
    </section>
  );
}
