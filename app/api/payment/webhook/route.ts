import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { parseThresholds, recordPoints } from "@/lib/loyalty";
import { captureError, captureMessage } from "@/lib/monitoring";
import { notifyOrderStatus } from "@/lib/notifications";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { stripe } from "@/lib/stripe";
import { toNumber } from "@/lib/utils";

// Stripe signs the raw body, so this route must not be pre-parsed or cached.
// It is also excluded from the auth middleware — the signature is the auth.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const client = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!client || !secret) {
    captureMessage("Stripe webhook hit but Stripe is not configured");
    return new Response("Stripe not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    captureError(error, { scope: "stripe-webhook-signature" });
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handleFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleRefunded(event.data.object);
        break;
      default:
        // Everything else is acknowledged and ignored on purpose.
        break;
    }
  } catch (error) {
    captureError(error, { scope: "stripe-webhook", type: event.type });
    // 500 makes Stripe retry, which is what we want for a transient failure.
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleSucceeded(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { locale: true } },
    },
  });

  if (!order) {
    captureMessage("Stripe webhook referenced an unknown order", { orderId });
    return;
  }

  // Stripe retries and may deliver the same event twice — make this idempotent.
  if (order.paymentStatus === "COMPLETED") return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "COMPLETED",
        paidAt: new Date(),
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        stripePaymentIntentId: intent.id,
      },
    });

    if (order.status === "PENDING") {
      await tx.orderStatusEvent.create({
        data: { orderId, status: "CONFIRMED", note: "Payment received" },
      });
    }

    // Points are only awarded once the money has actually landed.
    if (order.customerId && order.pointsEarned > 0) {
      const alreadyEarned = await tx.pointsTransaction.findFirst({
        where: { orderId, reason: "EARNED_ORDER" },
        select: { id: true },
      });

      if (!alreadyEarned) {
        await recordPoints(tx, {
          restaurantId: order.restaurantId,
          customerId: order.customerId,
          points: order.pointsEarned,
          reason: "EARNED_ORDER",
          orderId,
          note: `Earned on ${order.orderNumber}`,
          spendDelta: toNumber(order.totalAmount),
          thresholds: parseThresholds(RESTAURANT_CONFIG.tierThresholds),
        });
      }
    }
  });

  await notifyOrderStatus({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: "CONFIRMED",
    customerId: order.customerId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    orderType: order.orderType,
    locale: order.customer?.locale,
  });
}

async function handleFailed(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "COMPLETED" } },
    data: { paymentStatus: "FAILED" },
  });

  captureMessage("Payment failed", {
    orderId,
    reason: intent.last_payment_error?.message,
  });
}

async function handleRefunded(charge: Stripe.Charge) {
  const intentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!intentId) return;

  await prisma.order.updateMany({
    where: { stripePaymentIntentId: intentId },
    data: { paymentStatus: "REFUNDED" },
  });
}
