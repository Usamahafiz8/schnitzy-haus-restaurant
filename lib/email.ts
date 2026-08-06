import nodemailer, { type Transporter } from "nodemailer";

import { captureError, captureMessage, withRetry } from "@/lib/monitoring";
import { formatCurrency, formatDateTime } from "@/lib/utils";

let transporter: Transporter | null = null;
let resolved = false;

function getTransporter(): Transporter | null {
  if (resolved) return transporter;
  resolved = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    captureMessage("SMTP is not configured — emails will be logged, not sent");
    return null;
  }

  const port = Number(SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  return transporter;
}

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail({ to, subject, html, text }: MailInput) {
  const client = getTransporter();
  const from = process.env.EMAIL_FROM ?? "Schnitzy Haus <no-reply@localhost>";

  if (!client) {
    // Development fallback: surface the mail instead of silently dropping it.
    console.info(`\n--- EMAIL (not sent, SMTP unconfigured) ---
To: ${to}
Subject: ${subject}
${text ?? stripHtml(html)}
-------------------------------------------\n`);
    return { delivered: false as const };
  }

  try {
    await withRetry(
      () => client.sendMail({ from, to, subject, html, text: text ?? stripHtml(html) }),
      { label: "smtp-send" },
    );
    return { delivered: true as const };
  } catch (error) {
    captureError(error, { scope: "email", to, subject });
    return { delivered: false as const };
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const BRAND = "#b45309";

function layout(title: string, body: string, locale: string = "en") {
  const footer =
    locale === "de"
      ? "Sie erhalten diese E-Mail, weil Sie ein Konto bei Schnitzy Haus haben."
      : "You are receiving this email because you have a Schnitzy Haus account.";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:${BRAND};padding:20px 24px">
      <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:-0.01em">Schnitzy Haus</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c">
      ${footer}
    </div>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:${BRAND};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">${label}</a></p>`;
}

const t = {
  en: {
    orderSubject: (n: string) => `Order ${n} confirmed`,
    orderTitle: "Thanks for your order!",
    statusSubject: (n: string) => `Update on order ${n}`,
    bookingSubject: (n: string) => `Table booking ${n} confirmed`,
    resetSubject: "Reset your password",
    verifySubject: "Verify your email address",
    viewOrder: "View order",
    viewBooking: "View booking",
    reset: "Choose a new password",
    verify: "Verify email",
  },
  de: {
    orderSubject: (n: string) => `Bestellung ${n} bestätigt`,
    orderTitle: "Vielen Dank für Ihre Bestellung!",
    statusSubject: (n: string) => `Update zu Bestellung ${n}`,
    bookingSubject: (n: string) => `Tischreservierung ${n} bestätigt`,
    resetSubject: "Passwort zurücksetzen",
    verifySubject: "E-Mail-Adresse bestätigen",
    viewOrder: "Bestellung ansehen",
    viewBooking: "Reservierung ansehen",
    reset: "Neues Passwort wählen",
    verify: "E-Mail bestätigen",
  },
} as const;

type Locale = keyof typeof t;
const L = (locale?: string): Locale => (locale === "de" ? "de" : "en");

export function orderConfirmationEmail(params: {
  orderNumber: string;
  customerName: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  orderType: string;
  estimatedTime?: Date | null;
  locale?: string;
}): MailInput & { to: string } {
  const l = L(params.locale);
  const rows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity}× ${i.name}</td><td align="right" style="padding:6px 0">${formatCurrency(i.lineTotal, l)}</td></tr>`,
    )
    .join("");

  const line = (label: string, value: number) =>
    `<tr><td style="padding:4px 0;color:#57534e">${label}</td><td align="right" style="padding:4px 0">${formatCurrency(value, l)}</td></tr>`;

  const body = `
    <p>${l === "de" ? "Hallo" : "Hi"} ${params.customerName},</p>
    <p>${
      l === "de"
        ? `Ihre Bestellung <strong>${params.orderNumber}</strong> ist bei uns eingegangen.`
        : `We've received your order <strong>${params.orderNumber}</strong>.`
    }</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${rows}
      <tr><td colspan="2" style="border-top:1px solid #e7e5e4;padding-top:8px"></td></tr>
      ${line(l === "de" ? "Zwischensumme" : "Subtotal", params.subtotal)}
      ${params.deliveryFee > 0 ? line(l === "de" ? "Liefergebühr" : "Delivery", params.deliveryFee) : ""}
      ${params.discountAmount > 0 ? line(l === "de" ? "Rabatt" : "Discount", -params.discountAmount) : ""}
      ${line(l === "de" ? "MwSt." : "Tax", params.tax)}
      <tr><td style="padding-top:8px;font-weight:700">${l === "de" ? "Gesamt" : "Total"}</td><td align="right" style="padding-top:8px;font-weight:700">${formatCurrency(params.totalAmount, l)}</td></tr>
    </table>
    ${
      params.estimatedTime
        ? `<p style="color:#57534e">${l === "de" ? "Voraussichtlich fertig" : "Estimated ready"}: <strong>${formatDateTime(params.estimatedTime, l)}</strong></p>`
        : ""
    }
    ${button(`${appUrl()}/orders`, t[l].viewOrder)}
  `;

  return {
    to: "",
    subject: t[l].orderSubject(params.orderNumber),
    html: layout(t[l].orderTitle, body, l),
  };
}

export function orderStatusEmail(params: {
  orderNumber: string;
  customerName: string;
  statusLabel: string;
  message: string;
  locale?: string;
}): MailInput {
  const l = L(params.locale);
  const body = `
    <p>${l === "de" ? "Hallo" : "Hi"} ${params.customerName},</p>
    <p>${params.message}</p>
    <p style="font-size:15px"><strong>${params.statusLabel}</strong></p>
    ${button(`${appUrl()}/orders`, t[l].viewOrder)}
  `;
  return {
    to: "",
    subject: t[l].statusSubject(params.orderNumber),
    html: layout(t[l].statusSubject(params.orderNumber), body, l),
  };
}

export function bookingConfirmationEmail(params: {
  bookingNumber: string;
  customerName: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string | null;
  locale?: string;
}): MailInput {
  const l = L(params.locale);
  const body = `
    <p>${l === "de" ? "Hallo" : "Hi"} ${params.customerName},</p>
    <p>${
      l === "de"
        ? "Ihr Tisch ist reserviert. Wir freuen uns auf Sie!"
        : "Your table is booked. We look forward to seeing you!"
    }</p>
    <table style="width:100%;font-size:14px;margin:16px 0">
      <tr><td style="color:#57534e;padding:4px 0">${l === "de" ? "Referenz" : "Reference"}</td><td align="right"><strong>${params.bookingNumber}</strong></td></tr>
      <tr><td style="color:#57534e;padding:4px 0">${l === "de" ? "Datum" : "Date"}</td><td align="right">${params.date}</td></tr>
      <tr><td style="color:#57534e;padding:4px 0">${l === "de" ? "Uhrzeit" : "Time"}</td><td align="right">${params.time}</td></tr>
      <tr><td style="color:#57534e;padding:4px 0">${l === "de" ? "Gäste" : "Guests"}</td><td align="right">${params.guests}</td></tr>
      ${params.specialRequests ? `<tr><td style="color:#57534e;padding:4px 0">${l === "de" ? "Wünsche" : "Requests"}</td><td align="right">${params.specialRequests}</td></tr>` : ""}
    </table>
    ${button(`${appUrl()}/bookings`, t[l].viewBooking)}
  `;
  return {
    to: "",
    subject: t[l].bookingSubject(params.bookingNumber),
    html: layout(t[l].bookingSubject(params.bookingNumber), body, l),
  };
}

export function passwordResetEmail(params: {
  name: string;
  token: string;
  locale?: string;
}): MailInput {
  const l = L(params.locale);
  const href = `${appUrl()}/auth/reset-password?token=${encodeURIComponent(params.token)}`;
  const body = `
    <p>${l === "de" ? "Hallo" : "Hi"} ${params.name},</p>
    <p>${
      l === "de"
        ? "Klicken Sie auf den Button, um ein neues Passwort zu wählen. Der Link ist 60 Minuten gültig."
        : "Click the button below to choose a new password. This link expires in 60 minutes."
    }</p>
    ${button(href, t[l].reset)}
    <p style="font-size:12px;color:#78716c">${
      l === "de"
        ? "Wenn Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren."
        : "If you didn't request this, you can safely ignore this email."
    }</p>
  `;
  return { to: "", subject: t[l].resetSubject, html: layout(t[l].resetSubject, body, l) };
}

export function verifyEmailEmail(params: {
  name: string;
  token: string;
  locale?: string;
}): MailInput {
  const l = L(params.locale);
  const href = `${appUrl()}/auth/verify?token=${encodeURIComponent(params.token)}`;
  const body = `
    <p>${l === "de" ? "Hallo" : "Hi"} ${params.name},</p>
    <p>${
      l === "de"
        ? "Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren."
        : "Please confirm your email address to finish setting up your account."
    }</p>
    ${button(href, t[l].verify)}
  `;
  return { to: "", subject: t[l].verifySubject, html: layout(t[l].verifySubject, body, l) };
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
