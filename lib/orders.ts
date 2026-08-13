import "server-only";

import type { OrderStatus, Prisma, PrismaClient } from "@prisma/client";

import { conflict, badRequest } from "@/lib/errors";
import { toDateKey } from "@/lib/utils";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Human-readable, gap-free per day: SH-20260807-0001.
 *
 * The counter row is upserted inside the caller's transaction, so two
 * simultaneous checkouts serialise on the same row instead of colliding.
 *
 * On the first order of a day the counter is seeded from the highest number
 * already issued for that date. Without this, records that arrived by any other
 * route — a seed, a data import, a restore — would collide with the first live
 * order of the day.
 */
export async function nextOrderNumber(db: Db, at: Date = new Date()) {
  const day = toDateKey(at);
  const compact = day.replace(/-/g, "");

  const existing = await db.orderCounter.findUnique({ where: { day } });

  if (!existing) {
    const last = await db.order.findFirst({
      where: { orderNumber: { startsWith: `SH-${compact}-` } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const highest = last ? Number(last.orderNumber.slice(-4)) : 0;

    await db.orderCounter.upsert({
      where: { day },
      create: { day, value: Number.isFinite(highest) ? highest : 0 },
      update: {},
    });
  }

  const counter = await db.orderCounter.update({
    where: { day },
    data: { value: { increment: 1 } },
  });

  return `SH-${compact}-${String(counter.value).padStart(4, "0")}`;
}

export async function nextBookingNumber(db: Db, at: Date = new Date()) {
  const day = toDateKey(at);
  const compact = day.replace(/-/g, "");

  const existing = await db.bookingCounter.findUnique({ where: { day } });

  if (!existing) {
    const last = await db.tableBooking.findFirst({
      where: { bookingNumber: { startsWith: `BK-${compact}-` } },
      orderBy: { bookingNumber: "desc" },
      select: { bookingNumber: true },
    });
    const highest = last ? Number(last.bookingNumber.slice(-4)) : 0;

    await db.bookingCounter.upsert({
      where: { day },
      create: { day, value: Number.isFinite(highest) ? highest : 0 },
      update: {},
    });
  }

  const counter = await db.bookingCounter.update({
    where: { day },
    data: { value: { increment: 1 } },
  });

  return `BK-${compact}-${String(counter.value).padStart(4, "0")}`;
}

/**
 * Legal status moves. Prevents a kitchen tablet from dragging a delivered order
 * back to "preparing", and makes cancelled/delivered terminal.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) {
    throw conflict(
      `An order that is ${from.toLowerCase().replace(/_/g, " ")} cannot move to ${to
        .toLowerCase()
        .replace(/_/g, " ")}`,
    );
  }
}

/** Customers may only cancel while nothing has been cooked yet. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED"];

export function assertCustomerCanCancel(status: OrderStatus) {
  if (!CUSTOMER_CANCELLABLE.includes(status)) {
    throw badRequest(
      "This order is already being prepared. Please call the restaurant to cancel.",
    );
  }
}

export function estimateReadyAt(params: {
  preparationMinutes: number;
  orderType: string;
  scheduledFor?: Date | null;
}): Date {
  if (params.scheduledFor) return params.scheduledFor;

  const base = Math.max(10, params.preparationMinutes);
  const travel = params.orderType === "DELIVERY" ? 20 : 0;
  return new Date(Date.now() + (base + travel) * 60_000);
}

// The restaurant's profile (name, phone, currency, ...) is hardcoded now —
// see lib/restaurant-config.ts — so it's no longer part of this include.
export const ORDER_DETAIL_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" } },
  review: true,
} satisfies Prisma.OrderInclude;

export const ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  orderType: true,
  paymentStatus: true,
  paymentMethod: true,
  totalAmount: true,
  createdAt: true,
  estimatedDeliveryTime: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  items: { select: { id: true, name: true, quantity: true, lineTotal: true } },
} satisfies Prisma.OrderSelect;
