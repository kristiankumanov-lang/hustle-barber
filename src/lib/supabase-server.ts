/**
 * Supabase клиент — server-side достъп (service role key).
 * Използва се САМО в API routes / server components.
 * Чете bookings без RLS ограничения.
 * НИКОГА не импортирай този файл в client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";

export const supabaseServer: SupabaseClient = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey)
  : (null as unknown as SupabaseClient);

export function isServerConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseSecretKey);
}
