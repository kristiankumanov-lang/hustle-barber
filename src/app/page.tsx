import Script from "next/script";
import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { loadInitialBookingData } from "@/lib/queries-server";

/**
 * Server Component — business/services/working-hours/blocked-days се
 * fetch-ват тук (по време на render, на сървъра) вместо в useEffect след
 * hydration. Премахва client-side Supabase waterfall-а за initial load;
 * refetch-ът при връщане към таба (focus/visibility) в useBooking остава
 * client-side, непроменен.
 */
export default async function Home() {
  const initial = await loadInitialBookingData();

  if (initial.loadError) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <Header businessName="" />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-[#888]">{initial.loadError}</p>
        </div>
      </div>
    );
  }

  // reCAPTCHA v3 site key. Public — окей е да е в client bundle-а.
  // Скриптът се зарежда само тук (началната страница), защото само
  // BookingForm-ът (стъпка 4 от резервацията) го ползва — /admin и /cancel
  // не се нуждаят от него.
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header businessName={initial.businessName} />

      <HomeClient initial={initial} />

      {/* ── Footer ──────────────────────────────── */}
      <footer className="pb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[#2E2E2E]" />
          <div className="w-[5px] h-[5px] rotate-45 bg-[#333]" />
          <div className="h-px w-6 bg-[#2E2E2E]" />
        </div>
        <p className="text-[11px] text-[#444] tracking-[0.22em] uppercase"
           style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
          {initial.businessName || "Hustle Barber"}&nbsp;·&nbsp;{new Date().getFullYear()}
        </p>
        <p className="mt-3 text-[10px] text-[#A8A39A] tracking-wide">
          Powered by{" "}
          <a
            href="https://www.facebook.com/profile.php?id=61590868000717"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Kumanov AI Studio
          </a>
        </p>
      </footer>

      {/*
        reCAPTCHA v3 — зарежда се ленив (afterInteractive), за да не блокира
        render-а. Само ако SITE_KEY е конфигуриран — иначе пропускаме скрипта
        (например в локална среда без reCAPTCHA, формата ще даде ясна грешка).
      */}
      {RECAPTCHA_SITE_KEY ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      ) : null}
    </div>
  );
}
