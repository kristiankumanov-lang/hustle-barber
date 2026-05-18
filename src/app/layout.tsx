import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg" className={`${dmSerifDisplay.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
