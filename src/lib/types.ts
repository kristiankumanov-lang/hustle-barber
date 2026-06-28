/** Бизнес (от Supabase) */
export interface BusinessRow {
  id: string;
  name: string;
}

/** Услуга (от Supabase) */
export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
}

/** Работно време (от Supabase) */
export interface WorkingHoursRow {
  id: string;
  business_id: string;
  day_of_week: number; // 0=неделя, 6=събота
  start_time: string; // "10:00:00"
  end_time: string; // "19:00:00"
}

/** Времеви слот */
export interface TimeSlot {
  time: string; // "10:00", "10:30", ...
  available: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "expired" | "cancelled";

/** Данни от формата за записване */
export interface BookingFormData {
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  name: string;
  phone: string; // required от v2
  email?: string; // optional
}

/** Резултат от резервация */
export interface BookingResult {
  success: boolean;
  message: string;
  status?: BookingStatus;
  bookingId?: string;
  /** Telegram deep link за opt-in за напомняне 1 час преди (опционално). */
  telegramReminderUrl?: string;
}

/** Payload за POST /api/bookings */
export interface CreateBookingPayload {
  business_id: string;
  service_id: string;
  booking_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  customer_name: string;
  customer_phone: string; // required от v2
  customer_email?: string; // optional
  recaptcha_token: string;
}

/** Payload за POST /api/cancel */
export interface CancelBookingPayload {
  token: string;
}
