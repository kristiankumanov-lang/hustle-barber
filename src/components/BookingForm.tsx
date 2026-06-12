"use client";

import { useState } from "react";
import { Service, BookingResult } from "@/lib/types";
import { getServiceById } from "@/lib/services";
import { executeRecaptcha } from "@/lib/recaptcha";

interface Props {
  services: Service[];
  serviceId: string;
  date: string;
  time: string;
  isSubmitting: boolean;
  serverResult: BookingResult | null;
  onSubmit: (data: {
    name: string;
    phone: string;
    email?: string;
    recaptcha_token: string;
  }) => void;
  onBack: () => void;
}

/**
 * Валидира и нормализира БГ мобилен телефон към "+359XXXXXXXXX".
 * Приема: 0888..., 0888 123 456, +359888..., 359888...
 * Само мобилни префикси: 087, 088, 089.
 */
function normalizeBgMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;
  const digits = cleaned.replace(/^\+/, "");

  let nationalNumber: string;
  if (digits.startsWith("359")) {
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith("0")) {
    nationalNumber = digits.slice(1);
  } else {
    return null;
  }

  if (nationalNumber.length !== 9) return null;
  if (!/^(87|88|89)\d{7}$/.test(nationalNumber)) return null;

  return `+359${nationalNumber}`;
}

export default function BookingForm({
  services,
  serviceId,
  date,
  time,
  isSubmitting,
  serverResult,
  onSubmit,
  onBack,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);

  const service = getServiceById(services, serviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Моля, въведете вашето име.");
      return;
    }

    if (!phone.trim()) {
      setError("Моля, въведете вашия телефон.");
      return;
    }

    const normalizedPhone = normalizeBgMobile(phone);
    if (!normalizedPhone) {
      setError(
        "Невалиден телефон. Моля, въведете български мобилен номер (087/088/089)."
      );
      return;
    }

    if (email.trim() && !email.includes("@")) {
      setError("Моля, въведете валиден имейл адрес.");
      return;
    }

    setIsPreparing(true);
    let recaptchaToken: string;
    try {
      recaptchaToken = await executeRecaptcha("submit_booking");
    } catch (e) {
      console.error("reCAPTCHA грешка:", e);
      setError(
        "Защитата срещу спам не успя да се зареди. Опитайте отново след малко."
      );
      setIsPreparing(false);
      return;
    }
    setIsPreparing(false);

    onSubmit({
      name: name.trim(),
      phone: normalizedPhone,
      email: email.trim() || undefined,
      recaptcha_token: recaptchaToken,
    });
  }

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("bg-BG", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const inputClass = `
    w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A]
    text-[#EDE8E0] text-sm placeholder:text-[#4A4845]
    focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555]
    transition-all duration-150
  `;
  const labelClass =
    "block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase";
  const requiredStar = (
    <span className="text-[#EDE8E0]/50 normal-case tracking-normal"> *</span>
  );
  const optionalTag = (
    <span className="text-[#4A4845] normal-case tracking-normal font-normal">
      {" "}
      (по избор)
    </span>
  );

  const isBusy = isSubmitting || isPreparing;

  return (
    <section>
      <div className="step-heading">
        <span className="step-num">4</span>
        <span className="step-title">Вашите данни</span>
      </div>

      <div className="rounded-xl border border-[#333330] bg-[#1E1E1E] p-4 mb-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">
              Услуга
            </p>
            <p className="text-sm font-semibold text-[#C8C3B8] leading-tight">
              {service?.name}
            </p>
          </div>
          <div className="border-x border-[#333330]">
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">
              Дата
            </p>
            <p className="text-sm font-semibold text-[#C8C3B8] leading-tight capitalize">
              {formattedDate}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#4A4845] mb-1">
              Час
            </p>
            <p
              className="text-[1.3rem] font-bold text-[#EDE8E0] leading-tight"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              {time}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={labelClass}>
            Име{requiredStar}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Вашето пълно име"
            className={inputClass}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Телефон{requiredStar}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0888 123 456"
            className={inputClass}
            autoComplete="tel"
            inputMode="tel"
            required
          />
          <p className="text-[10px] text-[#4A4845] mt-1.5 ml-1">
            Български мобилен номер (087, 088 или 089)
          </p>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Имейл{optionalTag}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            autoComplete="email"
          />
          <p className="text-[10px] text-[#4A4845] mt-1.5 ml-1">
            Ако го оставиш, ще получиш потвърждение на мейла.
          </p>
        </div>

        <div className="rounded-xl border border-[#333330] bg-[#181818] p-3">
          <p className="text-xs leading-relaxed text-[#7A7570]">
            След натискане на бутона часът ще бъде запазен веднага. Ще получите
            опция за напомняне в Telegram 1 час преди часа.
          </p>
        </div>

        {(error || (serverResult && !serverResult.success)) && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-900/40 bg-red-950/30">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 mt-0.5 text-red-400"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 5v3.5M8 11h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm text-red-400">{error || serverResult?.message}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            className="px-5 py-3 rounded-xl border border-[#333330] text-[#7A7570]
              hover:bg-[#2A2A2A] hover:border-[#444] hover:text-[#AAA]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all text-sm font-medium"
          >
            ← Назад
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="flex-1 py-3 rounded-xl bg-[#EDE8E0] text-[#111111] font-semibold
              hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed
              transition-all text-sm tracking-wide shadow-sm"
          >
            {isBusy ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#111"
                    strokeWidth="3"
                    strokeOpacity="0.2"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="#111"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                {isPreparing ? "Подготовка..." : "Запазване..."}
              </span>
            ) : (
              "Запази час"
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-[#4A4845] pt-2">
          Тази страница е защитена с reCAPTCHA. Прилагат се{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-[#666]"
          >
            Политиката за поверителност
          </a>{" "}
          и{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-[#666]"
          >
            Условията за ползване
          </a>{" "}
          на Google.
        </p>
      </form>
    </section>
  );
}
