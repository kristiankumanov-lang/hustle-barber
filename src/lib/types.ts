/** Бизнес (от Supabase) */
export interface BusinessRow {
  id: string;
  name: string;
  email: string;
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

/** Данни от формата за записване */
export interface BookingFormData {
  serviceId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  time: string; // "10:00"
  name: string;
  email: string;
  phone?: string;
}

/** Резултат от резервация */
export interface BookingResult {
  success: boolean;
  message: string;
}

/** Payload за POST /api/bookings */
export interface CreateBookingPayload {
  business_id: string;
  service_id: string;
  booking_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
}
