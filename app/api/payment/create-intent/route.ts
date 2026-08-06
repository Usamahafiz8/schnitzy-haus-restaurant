import { z } from "zod";

import {
  badRequest,
  currentUser,
  forbidden,
  handler,
  notFound,
  ok,
  parseBody,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { isStripeEnabled, requireStripe, toMinorUnits } from "@/lib/stripe";
import { toNumber } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";

const schema = z.object({ orderId: z.string().uuid() });

/**
 * Returns a client secret for an existing order. Creating the order already
 * makes an intent; this exists so a customer who closed the tab (or whose card
 * was declined) can retry without placing a duplicate order.
 */
export const POST = handler(async (req: Request) => {
  if (!isStripeEnabled()) {
    throw badRequest("Card payments aren't configured on this deployment");
  }

  const { orderId } = await parseBody(req, schema);
  const user = await currentUser();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: { select: { currency: true, id: true } } },
  });

  if (!order) throw notFound("We couldn't find that order");

  const isOwner = user && order.customerId === user.id;
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const isGuestOrder = order.customerId === null;

  if (!isOwner && !isStaff && !isGuestOrder) {
    throw forbidden("This order belongs to a different account");
  }

  if (order.paymentStatus === "COMPLETED") {
    throw badRequest("This order has already been paid");
  }
  if (order.status === "CANCELLED") {
    throw badRequest("This order was cancelled");
  }

  const client = requireStripe();
  const amount = toMinorUnits(toNumber(order.totalAmount));

  // Reuse the existing intent when it's still usable, so we don't strand
  // half-finished payment attempts on the Stripe side.
  if (order.stripePaymentIntentId) {
    const existing = await client.paymentIntents.retrieve(order.stripePaymentIntentId);

    if (
      existing.status !== "canceled" &&
      existing.status !== "succeeded" &&
      existing.amount === amount
    ) {
      return ok({ clientSecret: existing.client_secret, amount: toNumber(order.totalAmount) });
    }

    if (existing.status !== "succeeded" && existing.status !== "canceled") {
      await client.paymentIntents.cancel(existing.id).catch(() => undefined);
    }
  }

  const intent = await client.paymentIntents.create({
    amount,
    currency: order.restaurant.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId: order.restaurant.id,
    },
    receipt_email: order.customerEmail,
    description: `Schnitzy Haus ${order.orderNumber}`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: intent.id },
  });

  return ok({ clientSecret: intent.client_secret, amount: toNumber(order.totalAmount) });
});
