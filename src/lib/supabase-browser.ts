/**
 * Supabase клиент за БРАУЗЪРА (client components).
 *
 * Използва publishable key + автоматично управление на auth cookies/session.
 * Login формата и client-side auth кодът ползват този клиент.
 *
 * NB: env naming-ът тук е "SUPABASE" (без второ "a") — съответства на
 * съществуващите env-и в проекта (NEXT_PUBLIC_SUPABASE_URL и т.н.).
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
