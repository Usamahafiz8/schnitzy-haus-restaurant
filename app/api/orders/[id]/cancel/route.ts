import {
  badRequest,
  currentUser,
  forbidden,
  handler,
  logActivity,
  notFound,
  ok,
  parseBody,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseThresholds, recordPoints } from "@/lib/loyalty";
import { captureError } from "@/lib/monitoring";
import { notifyOrderStatus } from "@/lib/notifications";
import { assertCustomerCanCancel, assertTransition } from "@/lib/orders";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { stripe } from "@/lib/stripe";
import { cancelOrderSchema } from "@/lib/validations";
import { STAFF_ROLES } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * Cancels an order and unwinds everything the order consumed: the Stripe
 * charge, the coupon use, and any points spent on it.
 */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const user = await currentUser();
  const input = await parseBody(req, cancelOrderSchema);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      redemption: true,
      customer: { select: { locale: true } },
    },
  });

  if (!order) throw notFound("We couldn't find that order");

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const isOwner = user && order.customerId === user.id;

  if (!isStaff && !isOwner) {
    throw forbidden("This order belongs to a different account");
  }

  if (order.status === "CANCELLED") {
    throw badRequest("This order is already cancelled");
  }

  if (isStaff) {
    assertTransition(order.status, "CANCELLED");
  } else {
    assertCustomerCanCancel(order.status);
  }

  // --- refund ---------------------------------------------------------------
  let refundId: string | null = null;

  if (
    input.refund &&
    order.paymentStatus === "COMPLETED" &&
    order.paymentMethod === "STRIPE" &&
    order.stripePaymentIntentId
  ) {
    const client = stripe();
    if (!client) {
      throw badRequest("Stripe isn't configured, so this order can't be refunded here.");
    }
    try {
      const refund = await client.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: "requested_by_customer",
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
      refundId = refund.id;
    } catch (error) {
      captureError(error, { scope: "refund", orderId: order.id });
      throw badRequest(
        "We couldn't process the refund with our payment provider. Please try again or contact us.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: input.reason ?? (isStaff ? "Cancelled by restaurant" : "Cancelled by customer"),
        ...(refundId
          ? { paymentStatus: "REFUNDED", stripeRefundId: refundId }
          : order.paymentStatus === "PENDING"
            ? { paymentStatus: "FAILED" }
            : {}),
      },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        status: "CANCELLED",
        note: input.reason ?? undefined,
        createdBy: user?.id,
      },
    });

    // Give the coupon use back.
    if (order.redemption) {
      await tx.coupon.update({
        where: { id: order.redemption.couponId },
        data: { usageCount: { decrement: 1 } },
      });
      await tx.couponRedemption.delete({ where: { id: order.redemption.id } });
    }

    // Return spent points and claw back anything already earned.
    if (order.customerId) {
      const thresholds = parseThresholds(RESTAURANT_CONFIG.tierThresholds);

      if (order.pointsRedeemed > 0) {
        await recordPoints(tx, {
          restaurantId: order.restaurantId,
          customerId: order.customerId,
          points: order.pointsRedeemed,
          reason: "MANUAL_ADJUSTMENT",
          orderId: order.id,
          note: `Refunded from cancelled ${order.orderNumber}`,
          thresholds,
        });
      }

      const earned = await tx.pointsTransaction.findFirst({
        where: { orderId: order.id, reason: "EARNED_ORDER" },
      });
      if (earned) {
        await recordPoints(tx, {
          restaurantId: order.restaurantId,
          customerId: order.customerId,
          points: -earned.points,
          reason: "MANUAL_ADJUSTMENT",
          orderId: order.id,
          note: `Reversed from cancelled ${order.orderNumber}`,
          spendDelta: -Number(order.totalAmount),
          thresholds,
        });
      }
    }
  });

  try {
    await notifyOrderStatus({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "CANCELLED",
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      orderType: order.orderType,
      locale: order.customer?.locale,
    });
  } catch (error) {
    captureError(error, { scope: "cancel-notify", orderId: id });
  }

  await logActivity(user?.id ?? null, "order.cancel", "Order", id, {
    orderNumber: order.orderNumber,
    refunded: Boolean(refundId),
    by: isStaff ? "staff" : "customer",
  });

  return ok({ cancelled: true, refunded: Boolean(refundId) });
});
