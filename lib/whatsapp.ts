import { captureError, captureMessage, withRetry } from "@/lib/monitoring";

type TwilioClient = {
  messages: {
    create(opts: {
      from: string;
      to: string;
      body: string;
      mediaUrl?: string[];
    }): Promise<{ sid: string }>;
  };
};

let client: TwilioClient | null = null;
let resolved = false;

async function getClient(): Promise<TwilioClient | null> {
  if (resolved) return client;
  resolved = true;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    captureMessage("Twilio is not configured — WhatsApp messages will be logged");
    return null;
  }

  try {
    const { default: twilio } = await import("twilio");
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) as unknown as TwilioClient;
  } catch (error) {
    captureError(error, { scope: "twilio-init" });
    client = null;
  }

  return client;
}

/** E.164 with the `whatsapp:` scheme Twilio expects. */
export function toWhatsAppAddress(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return `whatsapp:${e164}`;
}

export async function sendWhatsApp(params: {
  to: string;
  body: string;
  mediaUrl?: string[];
}): Promise<{ delivered: boolean; sid?: string }> {
  const twilioClient = await getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!twilioClient || !from) {
    console.info(`\n--- WHATSAPP (not sent, Twilio unconfigured) ---
To: ${params.to}
${params.body}
-----------------------------------------------\n`);
    return { delivered: false };
  }

  try {
    const message = await withRetry(
      () =>
        twilioClient.messages.create({
          from,
          to: toWhatsAppAddress(params.to),
          body: params.body,
          mediaUrl: params.mediaUrl,
        }),
      { label: "twilio-whatsapp" },
    );
    return { delivered: true, sid: message.sid };
  } catch (error) {
    captureError(error, { scope: "whatsapp", to: params.to });
    return { delivered: false };
  }
}

/** Click-to-chat link for the "WhatsApp us" button — needs no API credentials. */
export function whatsAppLink(number: string, message?: string) {
  const digits = number.replace(/[^\d]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export const whatsAppTemplates = {
  orderStatus: (
    orderNumber: string,
    statusLabel: string,
    locale: string,
  ): string =>
    locale === "de"
      ? `Schnitzy Haus: Ihre Bestellung ${orderNumber} ist jetzt "${statusLabel}".`
      : `Schnitzy Haus: your order ${orderNumber} is now "${statusLabel}".`,

  bookingConfirmed: (
    bookingNumber: string,
    date: string,
    time: string,
    guests: number,
    locale: string,
  ): string =>
    locale === "de"
      ? `Schnitzy Haus: Tisch für ${guests} am ${date} um ${time} bestätigt. Referenz ${bookingNumber}.`
      : `Schnitzy Haus: table for ${guests} on ${date} at ${time} is confirmed. Reference ${bookingNumber}.`,

  orderReady: (orderNumber: string, isDelivery: boolean, locale: string): string =>
    locale === "de"
      ? isDelivery
        ? `Ihre Bestellung ${orderNumber} ist unterwegs!`
        : `Ihre Bestellung ${orderNumber} ist abholbereit!`
      : isDelivery
        ? `Your order ${orderNumber} is on its way!`
        : `Your order ${orderNumber} is ready for pickup!`,
};
