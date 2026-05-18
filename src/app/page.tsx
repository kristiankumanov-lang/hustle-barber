"use client";

import { useRef } from "react";
import Header from "@/components/Header";
import ServiceList from "@/components/ServiceList";
import Calendar from "@/components/Calendar";
import TimeSlots from "@/components/TimeSlots";
import BookingForm from "@/components/BookingForm";
import SuccessMessage from "@/components/SuccessMessage";
import { useBooking } from "@/hooks/useBooking";

export default function Home() {
  const bookingRef = useRef<HTMLDivElement>(null);

  const {
    businessName, services, workingHours,
    isLoading, loadError,
    selectedService, selectedDate, selectedTime,
    confirmedService, confirmedDate, confirmedTime,
    step, result, isSubmitting,
    timeSlots, isSlotsLoading,
    selectService, selectDate, selectTime,
    submitBooking, reset, setStep,
  } = useBooking();

  const visibleServices = services.filter(
    (s) => s.name.toLowerCase() !== "друго"
  );

  function scrollToBooking() {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <Header businessName="" />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#555] text-[11px] tracking-[0.3em] uppercase"
               style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
              Зареждане
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <Header businessName="" />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-[#888]">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header businessName={businessName} />

      {/* ── CTA ─────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pt-6 pb-5 text-center">
        <button
          onClick={scrollToBooking}
          className="
            inline-flex items-center gap-2.5 px-7 py-3 rounded-full
            border border-[#F0EBE3]/20 bg-[#F0EBE3] text-[#111111]
            text-[12px] tracking-[0.25em] uppercase font-semibold
            hover:bg-white active:scale-[0.98]
            transition-all duration-150 shadow-sm
          "
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Запази своя час онлайн сега
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M5.5 1v8M2 6.5l3.5 3.5 3.5-3.5" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="h-px w-12 bg-[#2E2E2E]" />
          <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
            <rect x="3" y="0" width="2.1" height="2.1" transform="rotate(45 3 0)" fill="#3A3A3A"/>
          </svg>
          <div className="h-px w-12 bg-[#2E2E2E]" />
        </div>
      </div>

      {/* ── Booking card ────────────────────────── */}
      <div ref={bookingRef} className="max-w-2xl mx-auto px-4 pb-12 scroll-mt-4">
        <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
          {step === "success" && result ? (
            <div className="px-7 py-9 sm:px-10">
              <SuccessMessage
                result={result}
                onReset={reset}
                serviceName={visibleServices.find(s => s.id === confirmedService)?.name}
                date={confirmedDate}
                time={confirmedTime}
              />
            </div>
          ) : (
            <div className="px-6 py-7 sm:px-9 sm:py-8">
              <ServiceList services={visibleServices} selected={selectedService} onSelect={selectService} />

              {step !== "service" && (
                <>
                  <hr className="section-divider" />
                  <Calendar workingHours={workingHours} selected={selectedDate} onSelect={selectDate} />
                  <hr className="section-divider" />
                  <TimeSlots slots={timeSlots} selected={selectedTime} onSelect={selectTime} isLoading={isSlotsLoading} />
                </>
              )}

              {step === "form" && selectedTime && (
                <>
                  <hr className="section-divider" />
                  <BookingForm
                    services={visibleServices}
                    serviceId={selectedService}
                    date={selectedDate}
                    time={selectedTime}
                    isSubmitting={isSubmitting}
                    serverResult={result}
                    onSubmit={submitBooking}
                    onBack={() => setStep("datetime")}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="pb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[#2E2E2E]" />
          <div className="w-[5px] h-[5px] rotate-45 bg-[#333]" />
          <div className="h-px w-6 bg-[#2E2E2E]" />
        </div>
        <p className="text-[11px] text-[#444] tracking-[0.22em] uppercase"
           style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
          {businessName || "Hustle Barber"}&nbsp;·&nbsp;{new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
