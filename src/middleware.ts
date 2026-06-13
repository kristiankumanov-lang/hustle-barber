/**
 * Next.js Middleware — пази /admin/* маршрутите.
 *
 * Логика:
 *   - Login и change-password страниците са публични
 *   - Иначе /admin/* изисква auth (иначе → /admin/login)
 *   - Ако must_change_password=true → форсира /admin/change-password
 *
 * NB: env naming-ът тук е "SUPABASE" (без второ "a"), консистентно с проекта.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isChangePasswordPage = pathname === "/admin/change-password";
  const isAdminRoute = pathname.startsWith("/admin");

  // Login страницата е публична (но ако вече си логнат → dashboard).
  if (isLoginPage) {
    if (user) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // Защитени admin routes — изисквай auth.
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Принудителна смяна на парола при първи login.
    const must = user.user_metadata?.must_change_password === true;
    if (must && !isChangePasswordPage) {
      return NextResponse.redirect(new URL("/admin/change-password", request.url));
    }
    if (!must && isChangePasswordPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
