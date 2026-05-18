"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookingResult,
  Service,
  WorkingHoursRow,
  TimeSlot,
} from "@/lib/types";
import { fetchBusiness, fetchServices, fetchWorkingHours } from "@/lib/queries";

export type BookingStep = "service" | "datetime" | "form" | "success";

export function useBooking() {
  // Данни от Supabase
  const [businessId, setBusinessId] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  // Booking flow
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<BookingStep>("service");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Слотове от API route
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  // Зареждане на business, services, working_hours при mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError("");

      const business = await fetchBusiness();
      if (!business) {
        setLoadError("Няма намерен бизнес в базата данни.");
        setIsLoading(false);
        return;
      }

      setBusinessId(business.id);
      setBusinessName(business.name);

      const [svc, wh] = await Promise.all([
        fetchServices(business.id),
        fetchWorkingHours(business.id),
      ]);

      if (svc.length === 0) {
        setLoadError("Няма добавени услуги в базата данни.");
      }

      setServices(svc);
      setWorkingHours(wh);
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Зареждане на свободни слотове при смяна на дата
  const loadSlots = useCallback(
    async (dateStr: string) => {
      if (!dateStr || !businessId) {
        setTimeSlots([]);
        return;
      }

      setIsSlotsLoading(true);
      try {
        const res = await fetch(
          `/api/availability?date=${dateStr}&business_id=${businessId}&_t=${Date.now()}`
        );
        const json = await res.json();
        console.log("[loadSlots] API response:", JSON.stringify(json, null, 2));
        setTimeSlots(json.slots ?? []);
      } catch {
        console.error("Грешка при зареждане на слотове");
        setTimeSlots([]);
      }
      setIsSlotsLoading(false);
    },
    [businessId]
  );

  // Ако след обновяване на слотовете избраният час вече е зает, изчисти selection-а.
  // FIX БЪГ 1: Не пренасочвай ако в момента се показва съобщение за грешка —
  // потребителят трябва да види грешката, преди UI-ят да се смени.
  useEffect(() => {
    if (!selectedTime || timeSlots.length === 0) return;
    if (result && !result.success) return; // изчакай потребителят да види грешката
    const slot = timeSlots.find((s) => s.time === selectedTime);
    if (slot && !slot.available) {
      setSelectedTime("");
      if (step === "form") {
        setStep("datetime");
      }
    }
  }, [timeSlots, selectedTime, step, result]);

  function selectService(serviceId: string) {
    setSelectedService(serviceId);
    setSelectedTime("");
    setStep("datetime");
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedTime("");
    loadSlots(dateStr);
  }

  // FIX БЪГ 2: Изчисти предишната грешка при избор на нов час — иначе
  // старото error съобщение се показва в новата форма.
  function selectTime(time: string) {
    const slot = timeSlots.find((s) => s.time === time);
    if (!slot?.available) return;
    setSelectedTime(time);
    setResult(null);
    setStep("form");
  }

  async function submitBooking(
    data: { name: string; email: string; phone?: string }
  ) {
    // Защита срещу double submit
    if (isSubmitting) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: selectedService,
          booking_date: selectedDate,
          start_time: selectedTime,
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone,
        }),
      });

      const json = await res.json();

      setResult({
        success: json.success,
        message: json.message,
      });

      if (json.success) {
        setStep("success");
      }

      // Обновяване на слотовете след всеки опит (успешен или не)
      loadSlots(selectedDate);
    } catch {
      setResult({
        success: false,
        message: "Възникна грешка при свързване със сървъра.",
      });
    }

    setIsSubmitting(false);
  }

  function reset() {
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime("");
    setTimeSlots([]);
    setStep("service");
    setResult(null);
  }

  return {
    businessName,
    services,
    workingHours,
    isLoading,
    loadError,
    selectedService,
    selectedDate,
    selectedTime,
    step,
    result,
    isSubmitting,
    timeSlots,
    isSlotsLoading,
    selectService,
    selectDate,
    selectTime,
    submitBooking,
    reset,
    setStep,
  };
}

