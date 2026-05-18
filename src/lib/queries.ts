import { supabase, isSupabaseConfigured } from "./supabase";
import { BusinessRow, Service, WorkingHoursRow } from "./types";

export async function fetchBusiness(): Promise<BusinessRow | null> {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase не е конфигуриран. Проверете .env.local");
    return null;
  }

  const { data, error } = await supabase
    .from("business")
    .select("id, name, email")
    .limit(1)
    .single();

  if (error) {
    console.error("Грешка при зареждане на business:", error.message);
    return null;
  }

  return data;
}

export async function fetchServices(businessId: string): Promise<Service[]> {
  console.log("fetchServices called with:", businessId);
  const { data, error } = await supabase
    .from("services")
    .select("id, business_id, name, duration_minutes")
    .eq("business_id", businessId);

  console.log("services data:", data, "error:", error);
  return data ?? [];
}

export async function fetchWorkingHours(
  businessId: string
): Promise<WorkingHoursRow[]> {
  const { data, error } = await supabase
    .from("working_hours")
    .select("id, business_id, day_of_week, start_time, end_time")
    .eq("business_id", businessId);

  if (error) {
    console.error("Грешка при зареждане на working_hours:", error.message);
    return [];
  }

  return data ?? [];
}