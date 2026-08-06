import type { Prisma } from "@prisma/client";

import {
  badRequest,
  clientIp,
  created,
  currentUser,
  handler,
  logActivity,
  ok,
  paginate,
  paginated,
  parseBody,
  parseQuery,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { orderConfirmationEmail, sendMail } from "@/lib/email";
import { getOrCreateLoyaltyAccount, parseThresholds, recordPoints } from "@/lib/loyalty";
import { withinDeliveryRadius } from "@/lib/maps";
import { captureError } from "@/lib/monitoring";
import { notifyStaffNewOrder } from "@/lib/notifications";
import { estimateReadyAt, nextOrderNumber, ORDER_LIST_SELECT } from "@/lib/orders";
import { PricingError, priceOrder } from "@/lib/pricing";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireRestaurant } from "@/lib/restaurant";
import { isStripeEnabled, requireStripe, toMinorUnits } from "@/lib/stripe";
import { createOrderSchema, orderQuerySchema } from "@/lib/validations";
import { toNumber } from "@/lib/utils";

/** The signed-in customer's own orders. */
export const GET = handler(async (req: Request) => {
  const user = await currentUser();
  if (!user) return ok(paginated([], 0, 1, 20));

  const query = parseQuery(req, orderQuerySchema);

  const where: Prisma.OrderWhereInput = {
    customerId: user.id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.orderType ? { orderType: query.orderType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.pageSize),
      select: { ...ORDER_LIST_SELECT, review: { select: { id: true, rating: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return ok(paginated(items, total, query.page, query.pageSize));
});

/**
 * Creates an order. Everything that must agree — stock of the coupon, the
 * points balance, the order number — is written inside one transaction, so a
 * failure halfway through leaves nothing behind. Prices are recomputed here
 * from the live menu; the client's numbers are only ever a preview.
 */
export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "order", RATE_LIMITS.order.limit, RATE_LIMITS.order.windowMs);

  const input = await parseBody(req, createOrderSchema);
  const user = await currentUser();
  const restaurant = await requireRestaurant();

  if (!restaurant.isActive) {
    throw badRequest("We're not accepting orders right now. Please try again later.");
  }

  const typeEnabled =
    (input.orderType === "DELIVERY" && restaurant.deliveryEnabled) ||
    (input.orderType === "PICKUP" && restaurant.pickupEnabled) ||
    (input.orderType === "DINE_IN" && restaurant.dineInEnabled);
  if (!typeEnabled) {
    throw badRequest(`${input.orderType.toLowerCase().replace("_", "-")} orders are currently unavailable`);
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map((i) => i.itemId) }, restaurantId: restaurant.id },
  });

  if (menuItems.length !== new Set(input.items.map((i) => i.itemId)).size) {
    throw badRequest("Some items in your cart are no longer on the menu");
  }

  // --- delivery radius ------------------------------------------------------
  if (input.orderType === "DELIVERY" && input.deliveryLat && input.deliveryLng) {
    const check = withinDeliveryRadius(
      restaurant.latitude && restaurant.longitude
        ? { lat: restaurant.latitude, lng: restaurant.longitude }
        : null,
      { lat: input.deliveryLat, lng: input.deliveryLng },
      restaurant.deliveryRadiusKm,
    );
    if (!check.ok) {
      throw badRequest(
        `That address is ${check.distanceKm?.toFixed(1)} km away — outside our ${restaurant.deliveryRadiusKm} km delivery area.`,
      );
    }
  }

  // --- coupon ---------------------------------------------------------------
  const now = new Date();
  let coupon = null;

  if (input.couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { code: input.couponCode.toUpperCase() },
    });

    if (
      !coupon ||
      coupon.restaurantId !== restaurant.id ||
      !coupon.isActive ||
      coupon.validFrom > now ||
      coupon.validTo < now
    ) {
      throw badRequest("That coupon code isn't valid");
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw badRequest("That coupon has been fully redeemed");
    }

    if (user && coupon.perUserLimit !== null) {
      const used = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId: user.id },
      });
      if (used >= coupon.perUserLimit) {
        throw badRequest("You've already used that coupon");
      }
    }
  }

  // --- loyalty balance ------------------------------------------------------
  let availablePoints = 0;
  if (user && input.pointsToRedeem > 0) {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { restaurantId_customerId: { restaurantId: restaurant.id, customerId: user.id } },
      select: { points: true },
    });
    availablePoints = account?.points ?? 0;
    if (availablePoints < input.pointsToRedeem) {
      throw badRequest(`You only have ${availablePoints} points available`);
    }
  }

  // --- pricing --------------------------------------------------------------
  let pricing;
  try {
    pricing = priceOrder({
      lines: input.items.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        specialNotes: i.specialNotes || undefined,
      })),
      menuItems,
      restaurant,
      orderType: input.orderType,
      coupon,
      pointsToRedeem: input.pointsToRedeem,
      availablePoints,
      tipAmount: input.tipAmount,
    });
  } catch (error) {
    if (error instanceof PricingError) throw badRequest(error.message);
    throw error;
  }

  if (coupon && coupon.minOrderAmount && pricing.subtotal < toNumber(coupon.minOrderAmount)) {
    throw badRequest(
      `That coupon needs a subtotal of at least ${toNumber(coupon.minOrderAmount).toFixed(2)}`,
    );
  }

  const estimatedDeliveryTime = estimateReadyAt({
    preparationMinutes: pricing.preparationMinutes,
    orderType: input.orderType,
    scheduledFor: input.scheduledFor,
  });

  // --- write ----------------------------------------------------------------
  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await nextOrderNumber(tx, now);

    const record = await tx.order.create({
      data: {
        restaurantId: restaurant.id,
        customerId: user?.id ?? null,
        orderNumber,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        deliveryFee: pricing.deliveryFee,
        discountAmount: pricing.discountAmount,
        tipAmount: pricing.tipAmount,
        totalAmount: pricing.totalAmount,
        couponCode: coupon?.code ?? null,
        pointsRedeemed: pricing.pointsRedeemed,
        pointsEarned: pricing.pointsEarned,
        orderType: input.orderType,
        status: "PENDING",
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress || null,
        deliveryPostalCode: input.deliveryPostalCode || null,
        deliveryCity: input.deliveryCity || null,
        deliveryLat: input.deliveryLat ?? null,
        deliveryLng: input.deliveryLng ?? null,
        paymentStatus: "PENDING",
        paymentMethod: input.paymentMethod,
        specialNotes: input.specialNotes || null,
        scheduledFor: input.scheduledFor ?? null,
        estimatedDeliveryTime,
        items: {
          create: pricing.lines.map((line) => ({
            menuItemId: line.menuItemId,
            name: line.name,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
            specialNotes: line.specialNotes ?? null,
          })),
        },
        statusHistory: { create: [{ status: "PENDING", note: "Order placed" }] },
      },
      include: { items: true },
    });

    if (coupon) {
      // Conditional update: if another checkout took the last use between our
      // read and this write, `count` is 0 and we roll the whole thing back.
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          OR: [{ usageLimit: null }, { usageCount: { lt: coupon.usageLimit ?? 0 } }],
        },
        data: { usageCount: { increment: 1 } },
      });

      if (claimed.count === 0) {
        throw badRequest("That coupon was just fully redeemed. Please remove it.");
      }

      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: user?.id ?? null,
          orderId: record.id,
          amount: pricing.couponDiscount,
        },
      });
    }

    if (user && pricing.pointsRedeemed > 0) {
      await recordPoints(tx, {
        restaurantId: restaurant.id,
        customerId: user.id,
        points: -pricing.pointsRedeemed,
        reason: "REDEEMED",
        orderId: record.id,
        note: `Redeemed on ${orderNumber}`,
        thresholds: parseThresholds(restaurant.tierThresholds),
      });
    }

    if (user) {
      await getOrCreateLoyaltyAccount(tx, restaurant.id, user.id);
    }

    return record;
  });

  // --- payment intent -------------------------------------------------------
  let clientSecret: string | null = null;
  let status = order.status;

  if (input.paymentMethod === "STRIPE") {
    if (!isStripeEnabled()) {
      throw badRequest(
        "Card payments aren't configured. Please choose to pay on collection.",
      );
    }

    const intent = await requireStripe().paymentIntents.create({
      amount: toMinorUnits(pricing.totalAmount),
      currency: restaurant.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId: restaurant.id,
      },
      receipt_email: input.customerEmail,
      description: `Schnitzy Haus ${order.orderNumber}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: intent.id },
    });

    clientSecret = intent.client_secret;
  } else {
    // Cash orders skip the payment step and go straight into the queue.
    const confirmed = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
    await prisma.orderStatusEvent.create({
      data: { orderId: order.id, status: "CONFIRMED", note: "Cash order auto-confirmed" },
    });
    status = confirmed.status;
  }

  // --- notifications (best effort) -----------------------------------------
  try {
    const mail = orderConfirmationEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        lineTotal: toNumber(i.lineTotal),
      })),
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deliveryFee: pricing.deliveryFee,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      orderType: order.orderType,
      estimatedTime: estimatedDeliveryTime,
      locale: user ? undefined : "en",
    });
    await sendMail({ ...mail, to: order.customerEmail });

    await notifyStaffNewOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: pricing.totalAmount,
      orderType: order.orderType,
    });
  } catch (error) {
    captureError(error, { scope: "order-created-notify", orderId: order.id });
  }

  await logActivity(user?.id ?? null, "order.create", "Order", order.id, {
    orderNumber: order.orderNumber,
    total: pricing.totalAmount,
    ip: clientIp(req),
  });

  return created({
    id: order.id,
    orderNumber: order.orderNumber,
    totalAmount: pricing.totalAmount,
    status,
    paymentMethod: order.paymentMethod,
    estimatedDeliveryTime,
    clientSecret,
  });
});
