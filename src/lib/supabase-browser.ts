/**
 * Supabase клиент за БРАУЗЪРА (client components).
 *
 * Използва publishable key (anon key в стария naming) + автоматично управление
 * на auth cookies/session. Login формата и client-side auth кодът ползват този клиент.
 *
 * NB: env naming-ът тук съответства на съществуващия в проекта
 * (SUPABASE_*, не SUPABASE_*). Това запазва consistency с supabase-server.ts.
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
