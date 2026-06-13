/**
 * Next.js Middleware — пази /admin/* маршрутите.
 *
 * Логика:
 *   - Ако request-ът е за /admin/login или /admin/change-password → пусни (публични страници)
 *   - Иначе ако request-ът е за /admin/* и user НЕ е логнат → redirect към /admin/login
 *   - Ако user-ът е логнат + must_change_password=true + НЕ е на change-password → redirect към /admin/change-password
 *   - В останалите случаи → пусни нормално
 *
 * Middleware-ът се изпълнява на edge runtime ПРЕДИ да стигне до page/route handler-а.
 * Тук cookies могат да се set-ват свободно (за разлика от server components).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Важно: getUser() обновява session cookie-то ако е изтекло
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isChangePasswordPage = pathname === "/admin/change-password";
  const isAdminRoute = pathname.startsWith("/admin");

  // 1. Login и change-password страниците са публични — пусни ги.
  //    (Но ако вече си логнат и отидеш на login → redirect към dashboard.)
  if (isLoginPage) {
    if (user) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // 2. Защитени admin routes — изисквай auth.
  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Принудителна смяна на парола при първи login.
    const must = user.user_metadata?.must_change_password === true;
    if (must && !isChangePasswordPage) {
      return NextResponse.redirect(new URL("/admin/change-password", request.url));
    }

    // 4. Ако НЕ трябва да смени, но влиза на change-password → пусни към dashboard.
    if (!must && isChangePasswordPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  // Matcher: пуска middleware-а само за нужните маршрути.
  // Изключваме статични файлове, _next, и т.н., за да не зареждаме излишно Supabase клиент.
  matcher: ["/admin/:path*"],
};
