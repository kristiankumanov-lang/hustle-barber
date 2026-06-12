/**
 * Мейл към барбера при нова резервация.
 * Включва бутон "Отмени часа" (води към /cancel?token=...) и блок Calendar data
 * с машинно четима информация за бъдещ automation flow (Google Calendar).
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "kristiankumanov@gmail.com";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hustle-barber-beta.vercel.app"
  ).replace(/\/+$/, "");
}

export interface AdminBookingEmailPayload {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string;
  duration_minutes: number;
  booking_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS" или "HH:MM"
  end_time: string; // "HH:MM:SS" или "HH:MM"
  cancel_token: string;
}

export async function sendAdminBookingEmail(payload: AdminBookingEmailPayload) {
  const st = formatTime(payload.start_time);
  const et = formatTime(payload.end_time);
  const niceDate = formatDate(payload.booking_date);
  const emailDisplay = payload.customer_email ?? "Не е посочен";

  const cancelUrl = `${getSiteUrl()}/cancel?token=${encodeURIComponent(payload.cancel_token)}`;

  // Subject: машинно четим за по-късен parsing.
  const subject = `Нова резервация | Hustle Barber | ${payload.booking_date} ${st}`;

  // Plain-text вариант за scanner-и и за лесен parsing от automation.
  const textBody = [
    "Нова резервация в Hustle Barber",
    "",
    `Име: ${payload.customer_name}`,
    `Телефон: ${payload.customer_phone}`,
    `Email: ${emailDisplay}`,
    `Услуга: ${payload.service_name}`,
    `Дата: ${payload.booking_date}`,
    `Час: ${st}`,
    `Продължителност: ${payload.duration_minutes} мин.`,
    `Booking ID: ${payload.booking_id}`,
    "",
    "Calendar data:",
    `title: ${payload.service_name} - ${payload.customer_name}`,
    `start_date: ${payload.booking_date}`,
    `start_time: ${st}`,
    `duration_minutes: ${payload.duration_minutes}`,
    `phone: ${payload.customer_phone}`,
    `email: ${payload.customer_email ?? ""}`,
    `booking_id: ${payload.booking_id}`,
    "",
    `Отмени часа: ${cancelUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 4px 0;">Нова резервация</h2>
      <p style="color: #666; margin: 0 0 16px 0;">Hustle Barber</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #888; width: 140px;">Име</td><td style="padding: 6px 0; font-weight: 600;">${payload.customer_name}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Телефон</td><td style="padding: 6px 0; font-weight: 600;"><a href="tel:${payload.customer_phone}" style="color: #111; text-decoration: none;">${payload.customer_phone}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Email</td><td style="padding: 6px 0;">${emailDisplay}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Услуга</td><td style="padding: 6px 0; font-weight: 600;">${payload.service_name}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Дата</td><td style="padding: 6px 0; font-weight: 600;">${niceDate}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Час</td><td style="padding: 6px 0; font-weight: 600; font-size: 18px;">${st} — ${et}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Продължителност</td><td style="padding: 6px 0;">${payload.duration_minutes} мин.</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Booking ID</td><td style="padding: 6px 0; color: #aaa; font-family: monospace; font-size: 12px;">${payload.booking_id}</td></tr>
      </table>

      <div style="margin: 24px 0; text-align: center;">
        <a href="${cancelUrl}"
           style="display: inline-block; padding: 10px 20px; background: #f5f5f5; color: #c0392b; text-decoration: none; border: 1px solid #e0d0d0; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Отмени часа
        </a>
        <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">Линкът отваря страница за потвърждение.</p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

      <!-- Calendar data: машинно четим блок за automation flow към календара -->
      <pre style="background: #fafafa; padding: 12px; border-radius: 6px; font-size: 12px; color: #444; white-space: pre-wrap;">Calendar data:
title: ${payload.service_name} - ${payload.customer_name}
start_date: ${payload.booking_date}
start_time: ${st}
duration_minutes: ${payload.duration_minutes}
phone: ${payload.customer_phone}
email: ${payload.customer_email ?? ""}
booking_id: ${payload.booking_id}</pre>

      <p style="color: #aaa; font-size: 11px; text-align: center; margin: 16px 0 0 0;">Hustle Barber · Онлайн записване</p>
    </div>
  `;

  return resend.emails.send({
    from: "Hustle Barber <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject,
    text: textBody,
    html,
  });
}