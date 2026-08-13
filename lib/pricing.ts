import type { Coupon } from "@prisma/client";

import type { MenuItemData } from "@/lib/menu-data";
import type { RestaurantPricingConfig } from "@/lib/restaurant-config";
import { round2, toNumber } from "@/lib/utils";

export type PriceableLine = {
  itemId: string;
  quantity: number;
  specialNotes?: string;
};

export type PricedLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  specialNotes?: string;
  preparationTime: number;
};

export type PricingResult = {
  lines: PricedLine[];
  subtotal: number;
  discountAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  deliveryFee: number;
  tax: number;
  tipAmount: number;
  totalAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  preparationMinutes: number;
};

export class PricingError extends Error {}

/** The price a customer actually pays for an item right now. */
export function effectivePrice(item: Pick<MenuItemData, "price" | "discountPrice">) {
  const base = toNumber(item.price);
  const discounted = item.discountPrice === null ? null : toNumber(item.discountPrice);
  return discounted !== null && discounted > 0 && discounted < base ? discounted : base;
}

export function couponDiscountFor(
  coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscount">,
  subtotal: number,
): number {
  const value = toNumber(coupon.discountValue);
  const raw =
    coupon.discountType === "PERCENTAGE" ? (subtotal * value) / 100 : value;

  const cap = coupon.maxDiscount === null ? null : toNumber(coupon.maxDiscount);
  const capped = cap !== null && cap > 0 ? Math.min(raw, cap) : raw;

  // Never discount more than the order is worth.
  return round2(Math.max(0, Math.min(capped, subtotal)));
}

/**
 * Single source of truth for order totals. The client shows an estimate; this
 * function — running on the server against live menu prices — decides what is
 * actually charged.
 */
export function priceOrder(params: {
  lines: PriceableLine[];
  menuItems: MenuItemData[];
  restaurant: RestaurantPricingConfig;
  orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
  coupon?: Coupon | null;
  pointsToRedeem?: number;
  availablePoints?: number;
  tipAmount?: number;
  deliveryFeeOverride?: number | null;
}): PricingResult {
  const byId = new Map(params.menuItems.map((item) => [item.id, item]));
  const lines: PricedLine[] = [];

  for (const line of params.lines) {
    const item = byId.get(line.itemId);
    if (!item) throw new PricingError("An item in your cart is no longer available");
    if (!item.isAvailable) {
      throw new PricingError(`"${item.name}" is currently unavailable`);
    }

    const unitPrice = effectivePrice(item);
    lines.push({
      menuItemId: item.id,
      name: item.name,
      unitPrice,
      quantity: line.quantity,
      lineTotal: round2(unitPrice * line.quantity),
      specialNotes: line.specialNotes || undefined,
      preparationTime: item.preparationTime,
    });
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const minOrder = toNumber(params.restaurant.minOrderAmount);
  if (params.orderType === "DELIVERY" && subtotal < minOrder) {
    throw new PricingError(
      `Delivery orders have a minimum of ${minOrder.toFixed(2)}`,
    );
  }

  // --- delivery fee ---------------------------------------------------------
  let deliveryFee = 0;
  if (params.orderType === "DELIVERY") {
    const base =
      params.deliveryFeeOverride ?? toNumber(params.restaurant.deliveryFee);
    const freeOver =
      params.restaurant.freeDeliveryOver === null
        ? null
        : toNumber(params.restaurant.freeDeliveryOver);
    deliveryFee = freeOver !== null && freeOver > 0 && subtotal >= freeOver ? 0 : base;
  }

  // --- discounts ------------------------------------------------------------
  const couponDiscount = params.coupon
    ? couponDiscountFor(params.coupon, subtotal)
    : 0;

  const pointsPerUnit = params.restaurant.pointsPerDiscountUnit || 100;
  const requestedPoints = Math.max(0, Math.floor(params.pointsToRedeem ?? 0));
  const spendablePoints = Math.min(requestedPoints, params.availablePoints ?? 0);

  // Points may only reduce what's left after the coupon, never below zero.
  const redeemableValue = round2(
    Math.max(0, subtotal - couponDiscount),
  );
  const pointsValue = round2(spendablePoints / pointsPerUnit);
  const pointsDiscount = round2(Math.min(pointsValue, redeemableValue));
  const pointsRedeemed = Math.round(pointsDiscount * pointsPerUnit);

  const discountAmount = round2(couponDiscount + pointsDiscount);

  // --- tax ------------------------------------------------------------------
  // German VAT is included in menu prices, so tax is the portion of the
  // (already discounted) total rather than an amount added on top.
  const taxRate = toNumber(params.restaurant.taxRate);
  const taxableBase = round2(Math.max(0, subtotal - discountAmount) + deliveryFee);
  const tax = round2(taxableBase - taxableBase / (1 + taxRate / 100));

  const tipAmount = round2(Math.max(0, params.tipAmount ?? 0));
  const totalAmount = round2(taxableBase + tipAmount);

  // --- loyalty --------------------------------------------------------------
  const pointsEarned = Math.floor(
    Math.max(0, subtotal - discountAmount) *
      toNumber(params.restaurant.pointsPerCurrency),
  );

  const preparationMinutes = lines.reduce(
    (max, l) => Math.max(max, l.preparationTime),
    0,
  );

  return {
    lines,
    subtotal,
    discountAmount,
    couponDiscount,
    pointsDiscount,
    deliveryFee,
    tax,
    tipAmount,
    totalAmount,
    pointsRedeemed,
    pointsEarned,
    preparationMinutes,
  };
}
