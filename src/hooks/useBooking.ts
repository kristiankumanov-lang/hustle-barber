"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookingResult,
  Service,
  WorkingHoursRow,
  TimeSlot,
} from "@/lib/types";
import {
  fetchBusiness,
  fetchServices,
  fetchWorkingHours,
  fetchBlockedDays,
} from "@/lib/queries";

export type BookingStep = "service" | "datetime" | "form" | "success";

export function useBooking() {
  const [businessId, setBusinessId] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursRow[]>([]);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<BookingStep>("service");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  // Запазваме детайлите отделно, защото след submit reloadSlots може да изчисти selectedTime.
  const [confirmedService, setConfirmedService] = useState<string>("");
  const [confirmedDate, setConfirmedDate] = useState<string>("");
  const [confirmedTime, setConfirmedTime] = useState<string>("");

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

      const [svc, wh, blocked] = await Promise.all([
        fetchServices(business.id),
        fetchWorkingHours(business.id),
        fetchBlockedDays(business.id),
      ]);

      if (svc.length === 0) {
        setLoadError("Няма добавени услуги в базата данни.");
      }

      setServices(svc);
      setWorkingHours(wh);
      setBlockedDays(blocked);
      setIsLoading(false);
    }

    loadData();
  }, []);

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
        setTimeSlots(json.slots ?? []);
      } catch {
        console.error("Грешка при зареждане на слотове");
        setTimeSlots([]);
      }
      setIsSlotsLoading(false);
    },
    [businessId]
  );

  useEffect(() => {
    if (!selectedTime || timeSlots.length === 0) return;
    if (result && !result.success) return;
    if (step === "success") return;

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
    setResult(null);
    setStep("datetime");
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedTime("");
    setResult(null);
    loadSlots(dateStr);
  }

  function selectTime(time: string) {
    const slot = timeSlots.find((s) => s.time === time);
    if (!slot?.available) return;

    setSelectedTime(time);
    setResult(null);
    setStep("form");
  }

  async function submitBooking(data: {
    name: string;
    phone: string;
    email?: string;
    recaptcha_token: string;
  }) {
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
          customer_phone: data.phone,
          customer_email: data.email,
          recaptcha_token: data.recaptcha_token,
        }),
      });

      const json: BookingResult = await res.json();

      setResult({
        success: Boolean(json.success),
        message: json.message,
        status: json.status,
        bookingId: json.bookingId,
        telegramReminderUrl: json.telegramReminderUrl,
      });

      if (json.success) {
        setConfirmedService(selectedService);
        setConfirmedDate(selectedDate);
        setConfirmedTime(selectedTime);
        setStep("success");
      }

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
    setConfirmedService("");
    setConfirmedDate("");
    setConfirmedTime("");
    setTimeSlots([]);
    setStep("service");
    setResult(null);
  }

  return {
    businessName,
    services,
    workingHours,
    blockedDays,
    isLoading,
    loadError,
    selectedService,
    selectedDate,
    selectedTime,
    confirmedService,
    confirmedDate,
    confirmedTime,
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
