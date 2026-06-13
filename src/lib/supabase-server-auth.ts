/**
 * Supabase клиент за СЪРВЪРА с auth (server components / API routes / middleware).
 *
 * Чете auth cookies, за да знае кой е логнатият user.
 * НЕ е същото като supabase-server.ts — този ползва publishable key + cookies (auth context),
 * а supabase-server.ts ползва service_role key (заобикаля RLS, няма user context).
 *
 * Кога кой:
 *   - Trябва да знаеш "кой user прави това" → supabase-server-auth
 *   - Trябва да четеш/пишеш без user context (cron jobs, public booking insert) → supabase-server
 *
 * NB: env naming-ът тук е "SUPABASE" (без второ "a"), консистентно с проекта.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // В server components не можем да set-ваме cookies — middleware-ът го прави.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Същата причина — само в Route Handlers/Server Actions работи.
          }
        },
      },
    }
  );
}

/** Връща текущия логнат user (или null). */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Проверка дали user-ът е "barber" (role от user_metadata). */
export function isBarberUser(user: { user_metadata?: { role?: string } } | null): boolean {
  return user?.user_metadata?.role === "barber";
}

/** Проверка дали user-ът трябва да смени паролата (първи login). */
export function mustChangePassword(
  user: { user_metadata?: { must_change_password?: boolean } } | null
): boolean {
  return user?.user_metadata?.must_change_password === true;
}
