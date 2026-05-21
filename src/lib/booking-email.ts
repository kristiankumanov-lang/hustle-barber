import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kristiankumanov@gmail.com";

export type AdminBookingEmailPayload = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  service_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
};

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAdminBookingEmail(payload: AdminBookingEmailPayload) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY липсва. Пропускам admin email.");
    return;
  }

  const startTime = formatTime(payload.start_time);
  const endTime = formatTime(payload.end_time);

  await resend.emails.send({
    from: "Hustle Barber <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject: `🪒 Нова потвърдена резервация — ${startTime} | ${formatDate(payload.booking_date)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; margin-bottom: 4px;">Нова потвърдена резервация</h2>
        <p style="color: #666; margin-top: 0;">Hustle Barber</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #888; width: 120px;">Клиент</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${escapeHtml(payload.customer_name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Услуга</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${escapeHtml(payload.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Дата</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${formatDate(payload.booking_date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Час</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111; font-size: 20px;">${startTime} — ${endTime}</td>
          </tr>
          ${payload.customer_phone ? `<tr>
            <td style="padding: 8px 0; color: #888;">Телефон</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${escapeHtml(payload.customer_phone)}</td>
          </tr>` : ""}
          ${payload.customer_email ? `<tr>
            <td style="padding: 8px 0; color: #888;">Имейл</td>
            <td style="padding: 8px 0; color: #111;">${escapeHtml(payload.customer_email)}</td>
          </tr>` : ""}
        </table>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">Hustle Barber · Онлайн записване</p>
      </div>
    `,
  });
}
