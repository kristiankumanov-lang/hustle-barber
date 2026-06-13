/**
 * Имейли при нова резервация.
 *
 *  - sendAdminBookingEmail → към барбера, с cancel бутон + Calendar data блок
 *  - sendClientBookingEmail → към клиента (само ако е оставил мейл)
 *
 * NB: В sandbox режим (sender onboarding@resend.dev) Resend позволява
 * пращане САМО на акаунт-собственика. Затова клиентският мейл се праща
 * с BCC към ADMIN_EMAIL — така физически "стига" до Resend и не се
 * губи. Когато се купи реален домейн и се verify-не, BCC-то може да
 * отпадне (или да остане за audit log).
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

// ─────────────────────────────────────────────────────────────
// АДМИН (към барбера)
// ─────────────────────────────────────────────────────────────

export interface AdminBookingEmailPayload {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string;
  duration_minutes: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  cancel_token: string;
}

export async function sendAdminBookingEmail(payload: AdminBookingEmailPayload) {
  const st = formatTime(payload.start_time);
  const et = formatTime(payload.end_time);
  const niceDate = formatDate(payload.booking_date);
  const emailDisplay = payload.customer_email ?? "Не е посочен";

  const cancelUrl = `${getSiteUrl()}/cancel?token=${encodeURIComponent(payload.cancel_token)}`;

  const subject = `Нова резервация | Hustle Barber | ${payload.booking_date} ${st}`;

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

// ─────────────────────────────────────────────────────────────
// КЛИЕНТ (към клиента)
// В sandbox phase минава с BCC към admin-а, за да не блокира Resend.
// ─────────────────────────────────────────────────────────────

export interface ClientBookingEmailPayload {
  to_email: string;
  customer_name: string;
  service_name: string;
  duration_minutes: number;
  booking_date: string;
  start_time: string;
  end_time: string;
}

export async function sendClientBookingEmail(payload: ClientBookingEmailPayload) {
  const st = formatTime(payload.start_time);
  const et = formatTime(payload.end_time);
  const niceDate = formatDate(payload.booking_date);

  const subject = `Часът ти е запазен — Hustle Barber, ${payload.booking_date} ${st}`;

  const textBody = [
    `Здрасти, ${payload.customer_name}!`,
    "",
    "Часът ти в Hustle Barber е запазен.",
    "",
    `Услуга: ${payload.service_name}`,
    `Дата: ${niceDate}`,
    `Час: ${st} — ${et}`,
    `Продължителност: ${payload.duration_minutes} мин.`,
    "",
    "Очакваме те! Ако нещо изскочи и не можеш да дойдеш, моля обади се навреме.",
    "",
    "До скоро,",
    "Екипът на Hustle Barber",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; color: #111;">
      <h2 style="margin: 0 0 8px 0; font-size: 22px;">Часът ти е запазен 💈</h2>
      <p style="color: #666; margin: 0 0 20px 0;">Hustle Barber</p>

      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 18px 0;">
        Здрасти, <strong>${payload.customer_name}</strong>! Часът ти е запазен. Очакваме те!
      </p>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fafafa; border-radius: 8px; padding: 4px;">
        <tr><td style="padding: 10px 14px; color: #888; width: 130px;">Услуга</td><td style="padding: 10px 14px; font-weight: 600;">${payload.service_name}</td></tr>
        <tr><td style="padding: 10px 14px; color: #888;">Дата</td><td style="padding: 10px 14px; font-weight: 600;">${niceDate}</td></tr>
        <tr><td style="padding: 10px 14px; color: #888;">Час</td><td style="padding: 10px 14px; font-weight: 600; font-size: 18px;">${st} — ${et}</td></tr>
        <tr><td style="padding: 10px 14px; color: #888;">Продължителност</td><td style="padding: 10px 14px;">${payload.duration_minutes} мин.</td></tr>
      </table>

      <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 22px 0 0 0;">
        Ако нещо изскочи и не можеш да дойдеш, моля обади се навреме —
        ще освободим часа за някой друг.
      </p>

      <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 18px 0 0 0;">
        До скоро,<br/>
        <strong>Екипът на Hustle Barber</strong>
      </p>

      <p style="color: #aaa; font-size: 11px; text-align: center; margin: 28px 0 0 0;">Hustle Barber · Онлайн записване</p>
    </div>
  `;

  // BCC към admin-а — sandbox workaround.
  // Когато домейнът е verified, BCC-то може да отпадне.
  return resend.emails.send({
    from: "Hustle Barber <onboarding@resend.dev>",
    to: payload.to_email,
    bcc: ADMIN_EMAIL,
    subject,
    text: textBody,
    html,
  });
}
