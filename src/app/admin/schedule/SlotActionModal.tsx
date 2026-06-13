"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Props {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  /** Преинициализирани от родителя (за overlap checks или показване) */
  onClose: () => void;
  onBlock: () => void;
  /** Извиква API-то за manual booking и при успех затваря modal-а */
  onBookingCreated: () => void;
}

function formatDateBG(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Mode = "choose" | "book";

export default function SlotActionModal({
  date,
  startTime,
  onClose,
  onBlock,
  onBookingCreated,
}: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Зареждане на услугите при отваряне на "book" режим
  useEffect(() => {
    if (mode !== "book") return;
    if (services.length > 0) return;

    setIsLoadingServices(true);
    fetch("/api/services-public")
      .then((res) => res.json())
      .then((json: { services?: Service[] }) => {
        const svc = json.services ?? [];
        setServices(svc);
        if (svc.length > 0 && !serviceId) setServiceId(svc[0].id);
      })
      .catch(() => {
        setError("Не успях да заредя услугите.");
      })
      .finally(() => setIsLoadingServices(false));
  }, [mode, services.length, serviceId]);

  // Затваряне с Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Моля, въведете име.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Моля, въведете телефон.");
      return;
    }
    if (!serviceId) {
      setError("Моля, изберете услуга.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/manual-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          booking_date: date,
          start_time: startTime,
          customer_name: customerName,
          customer_phone: customerPhone,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "Грешка при добавяне.");
        setIsSubmitting(false);
        return;
      }
      onBookingCreated();
    } catch {
      setError("Мрежова грешка. Опитай пак.");
      setIsSubmitting(false);
    }
  }

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
          <div>
            <h3 className="text-lg font-semibold text-[#EDE8E0]">
              {mode === "choose" ? "Избери действие" : "Добави час"}
            </h3>
            <p className="text-xs text-[#7A7570] mt-0.5 capitalize">
              {formatDateBG(date)} · {startTime}
            </p>
          </div>
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

        {mode === "choose" ? (
          <div className="p-5 space-y-3">
            <button
              onClick={() => setMode("book")}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] hover:bg-[#252525] hover:border-[#444] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[#EDE8E0]/10 flex items-center justify-center text-[#EDE8E0]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#EDE8E0]">
                  Запази час за клиент
                </p>
                <p className="text-xs text-[#7A7570]">
                  Ръчно добавяне на резервация
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                onBlock();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-900/30 bg-red-950/15 hover:bg-red-950/30 hover:border-red-900/50 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-red-900/20 flex items-center justify-center text-red-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-300">
                  Блокирай слота
                </p>
                <p className="text-xs text-[#7A7570]">
                  Маркирай като зает, без резервация
                </p>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm text-[#7A7570] hover:text-[#EDE8E0] transition-colors"
            >
              Отказ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Услуга */}
            <div>
              <label
                htmlFor="ma_service"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Услуга
              </label>
              {isLoadingServices ? (
                <div className="px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A] text-sm text-[#7A7570]">
                  Зареждам...
                </div>
              ) : (
                <select
                  id="ma_service"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A] text-[#EDE8E0] text-sm focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555] transition-all"
                  disabled={isSubmitting}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} мин.)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Име */}
            <div>
              <label
                htmlFor="ma_name"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Име
              </label>
              <input
                id="ma_name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Име на клиент"
                autoComplete="off"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A] text-[#EDE8E0] text-sm placeholder:text-[#4A4845] focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555] transition-all"
              />
            </div>

            {/* Телефон */}
            <div>
              <label
                htmlFor="ma_phone"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Телефон
              </label>
              <input
                id="ma_phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Произволен формат"
                autoComplete="off"
                inputMode="tel"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A] text-[#EDE8E0] text-sm placeholder:text-[#4A4845] focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555] transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-900/40 bg-red-950/30 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode("choose")}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-lg border border-[#2E2E2E] text-[#C8C3B8] hover:bg-[#222] disabled:opacity-50 text-sm font-medium transition-all"
              >
                ← Назад
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#EDE8E0] text-[#111] font-semibold hover:bg-white disabled:opacity-50 text-sm transition-all"
              >
                {isSubmitting ? "Запазване..." : "Запази час"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
