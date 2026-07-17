"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import ServiceList from "@/components/ServiceList";
import { useBooking, BookingInitialData } from "@/hooks/useBooking";

/**
 * Calendar / TimeSlots / BookingForm / SuccessMessage не се рендират при
 * mount (стъпката винаги стартира от "service") — code-split-нати са с
 * next/dynamic + ssr:false, за да не тежат в initial JS payload-а на "/".
 * Влизат в отделен chunk, зареждан само когато потребителят реално стигне
 * до съответната стъпка.
 */
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });
const TimeSlots = dynamic(() => import("@/components/TimeSlots"), { ssr: false });
const BookingForm = dynamic(() => import("@/components/BookingForm"), { ssr: false });
const SuccessMessage = dynamic(() => import("@/components/SuccessMessage"), { ssr: false });

interface Props {
  initial: BookingInitialData;
}

export default function HomeClient({ initial }: Props) {
  const bookingRef = useRef<HTMLDivElement>(null);

  const {
    services,
    workingHours, blockedDays,
    selectedService, selectedDate, selectedTime,
    confirmedService, confirmedDate, confirmedTime,
    step, result, isSubmitting,
    timeSlots, isSlotsLoading,
    selectService, selectDate, selectTime,
    submitBooking, reset, setStep,
  } = useBooking(initial);

  const visibleServices = services.filter(
    (s) => s.name.toLowerCase() !== "друго"
  );

  function scrollToBooking() {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
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
                  <Calendar
                    workingHours={workingHours}
                    blockedDays={blockedDays}
                    selected={selectedDate}
                    onSelect={selectDate}
                  />
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
    </>
  );
}
