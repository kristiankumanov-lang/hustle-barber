import type { Metadata } from "next";
import Script from "next/script";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";

/**
 * DM Serif Display — elegant, readable serif за branding и section titles.
 * Не е орнаментален, не е "fashion", не е western.
 * Premium small-business feel. Отлична четимост дори при по-малки размери.
 */
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],          // идва само в regular — достатъчно за display use
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

/**
 * DM Sans — clean, modern, premium sans-serif за целия UI.
 * Cohesive с DM Serif Display (едно дизайн семейство).
 * Отлична четимост в labels, buttons, body text.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hustle Barber — Запази час онлайн",
  description: "Онлайн записване за час при Hustle Barber.",
};

// reCAPTCHA v3 site key. Public — окей е да е в client bundle-а.
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg" className={`${dmSerifDisplay.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">
        {children}

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
      </body>
    </html>
  );
}
