import "server-only";

import type { NotificationType, OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendMail, orderStatusEmail, bookingConfirmationEmail } from "@/lib/email";
import { captureError } from "@/lib/monitoring";
import { sendPushToUser } from "@/lib/push";
import { publish } from "@/lib/realtime";
import { sendWhatsApp, whatsAppTemplates } from "@/lib/whatsapp";

export const ORDER_STATUS_COPY: Record<
  OrderStatus,
  { en: { label: string; message: string }; de: { label: string; message: string } }
> = {
  PENDING: {
    en: { label: "Order received", message: "We've received your order and are confirming it now." },
    de: { label: "Bestellung eingegangen", message: "Wir haben Ihre Bestellung erhalten und bestätigen sie gleich." },
  },
  CONFIRMED: {
    en: { label: "Order confirmed", message: "Your order is confirmed and heading to the kitchen." },
    de: { label: "Bestellung bestätigt", message: "Ihre Bestellung ist bestätigt und geht in die Küche." },
  },
  PREPARING: {
    en: { label: "In the kitchen", message: "Our chefs have started preparing your food." },
    de: { label: "In der Küche", message: "Unsere Köche bereiten Ihr Essen zu." },
  },
  READY: {
    en: { label: "Ready", message: "Your order is ready." },
    de: { label: "Fertig", message: "Ihre Bestellung ist fertig." },
  },
  OUT_FOR_DELIVERY: {
    en: { label: "Out for delivery", message: "Your order is on its way to you." },
    de: { label: "Unterwegs", message: "Ihre Bestellung ist auf dem Weg zu Ihnen." },
  },
  DELIVERED: {
    en: { label: "Completed", message: "Enjoy your meal! We'd love to hear how it was." },
    de: { label: "Abgeschlossen", message: "Guten Appetit! Wir freuen uns über Ihr Feedback." },
  },
  CANCELLED: {
    en: { label: "Cancelled", message: "Your order has been cancelled." },
    de: { label: "Storniert", message: "Ihre Bestellung wurde storniert." },
  },
};

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedOrderId?: string;
  channels?: { push?: boolean; email?: boolean; whatsapp?: boolean };
  email?: { subject: string; html: string };
  whatsappBody?: string;
};

/**
 * Writes the in-app notification, then fans out to push/email/WhatsApp
 * according to the user's own preferences. Channel failures are logged but
 * never propagate — a dead SMTP server must not roll back an order.
 */
export async function notifyUser(input: NotifyInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      locale: true,
      notifyEmail: true,
      notifyPush: true,
      notifyWhatsapp: true,
      notifyMarketing: true,
    },
  });
  if (!user) return;

  // Marketing is opt-out; transactional messages always go through.
  if (input.type === "PROMOTION" && !user.notifyMarketing) return;

  const wantPush = input.channels?.push !== false && user.notifyPush;
  const wantEmail = input.channels?.email !== false && user.notifyEmail;
  const wantWhatsapp =
    input.channels?.whatsapp === true && user.notifyWhatsapp && Boolean(user.phone);

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      relatedOrderId: input.relatedOrderId,
    },
  });

  publish(`user:${user.id}`, { kind: "notification", notification: { id: notification.id, title: input.title, message: input.message } });

  const tasks: Promise<unknown>[] = [];

  if (wantPush) {
    tasks.push(
      sendPushToUser({
        userId: user.id,
        title: input.title,
        body: input.message,
        link: input.link,
      })
        .then((result) =>
          result.delivered
            ? prisma.notification.update({
                where: { id: notification.id },
                data: { isPushed: true },
              })
            : null,
        )
        .catch((error) => captureError(error, { scope: "notify-push" })),
    );
  }

  if (wantEmail && input.email && user.email) {
    tasks.push(
      sendMail({
        to: user.email,
        subject: input.email.subject,
        html: input.email.html,
      }).catch((error) => captureError(error, { scope: "notify-email" })),
    );
  }

  if (wantWhatsapp && input.whatsappBody && user.phone) {
    tasks.push(
      sendWhatsApp({ to: user.phone, body: input.whatsappBody }).catch((error) =>
        captureError(error, { scope: "notify-whatsapp" }),
      ),
    );
  }

  await Promise.allSettled(tasks);
  return notification;
}

export async function notifyOrderStatus(params: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: string;
  locale?: string;
}) {
  const locale = params.locale === "de" ? "de" : "en";
  const copy = ORDER_STATUS_COPY[params.status][locale];

  // Anyone watching this order's live feed gets the update, signed in or not.
  publish(`order:${params.orderId}`, {
    kind: "order-status",
    orderId: params.orderId,
    status: params.status,
    label: copy.label,
    at: new Date().toISOString(),
  });

  const whatsappBody =
    params.status === "READY" || params.status === "OUT_FOR_DELIVERY"
      ? whatsAppTemplates.orderReady(
          params.orderNumber,
          params.orderType === "DELIVERY",
          locale,
        )
      : whatsAppTemplates.orderStatus(params.orderNumber, copy.label, locale);

  const email = orderStatusEmail({
    orderNumber: params.orderNumber,
    customerName: params.customerName,
    statusLabel: copy.label,
    message: copy.message,
    locale,
  });

  if (params.customerId) {
    await notifyUser({
      userId: params.customerId,
      type: "ORDER_UPDATE",
      title: `${copy.label} — ${params.orderNumber}`,
      message: copy.message,
      link: `/orders/${params.orderId}`,
      relatedOrderId: params.orderId,
      channels: { whatsapp: true },
      email: { subject: email.subject, html: email.html },
      whatsappBody,
    });
    return;
  }

  // Guest checkout: no account to attach a notification to, so email directly.
  await sendMail({ to: params.customerEmail, subject: email.subject, html: email.html });
}

export async function notifyBookingConfirmed(params: {
  bookingId: string;
  bookingNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string | null;
  locale?: string;
}) {
  const locale = params.locale === "de" ? "de" : "en";
  const email = bookingConfirmationEmail({
    bookingNumber: params.bookingNumber,
    customerName: params.customerName,
    date: params.date,
    time: params.time,
    guests: params.guests,
    specialRequests: params.specialRequests,
    locale,
  });

  const title =
    locale === "de" ? "Reservierung bestätigt" : "Booking confirmed";
  const message =
    locale === "de"
      ? `Tisch für ${params.guests} am ${params.date} um ${params.time}.`
      : `Table for ${params.guests} on ${params.date} at ${params.time}.`;

  if (params.customerId) {
    await notifyUser({
      userId: params.customerId,
      type: "BOOKING_CONFIRMATION",
      title,
      message,
      link: `/bookings`,
      channels: { whatsapp: true },
      email: { subject: email.subject, html: email.html },
      whatsappBody: whatsAppTemplates.bookingConfirmed(
        params.bookingNumber,
        params.date,
        params.time,
        params.guests,
        locale,
      ),
    });
    return;
  }

  await sendMail({ to: params.customerEmail, subject: email.subject, html: email.html });
}

/** Broadcast to every dashboard user so new orders appear without a refresh. */
export async function notifyStaffNewOrder(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orderType: string;
}) {
  publish("staff", {
    kind: "new-order",
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    orderType: order.orderType,
    at: new Date().toISOString(),
  });

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF", "KITCHEN"] }, isDeleted: false },
    select: { id: true },
  });

  await Promise.allSettled(
    staff.map((member) =>
      notifyUser({
        userId: member.id,
        type: "ORDER_UPDATE",
        title: `New order ${order.orderNumber}`,
        message: `${order.orderType} — €${order.totalAmount.toFixed(2)}`,
        link: `/admin/orders/${order.id}`,
        relatedOrderId: order.id,
        channels: { email: false },
      }),
    ),
  );
}
