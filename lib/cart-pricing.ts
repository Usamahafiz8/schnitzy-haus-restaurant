import { round2 } from "@/lib/utils";
import type { CartLine, OrderType } from "@/types";

/**
 * Client-side mirror of `lib/pricing.ts` for showing running totals in the cart
 * and checkout. The server recomputes everything from live menu prices before
 * charging anyone — this is a preview and is never trusted.
 */
export type RestaurantPricingConfig = {
  currency: string;
  taxRate: number;
  deliveryFee: number;
  freeDeliveryOver: number | null;
  minOrderAmount: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
};

export type CartTotals = {
  subtotal: number;
  deliveryFee: number;
  couponDiscount: number;
  pointsDiscount: number;
  discountAmount: number;
  tax: number;
  tipAmount: number;
  total: number;
  belowMinimum: boolean;
  amountToFreeDelivery: number | null;
};

export function computeCartTotals(params: {
  lines: CartLine[];
  orderType: OrderType;
  config: RestaurantPricingConfig;
  couponDiscount?: number;
  pointsToRedeem?: number;
  pointsPerDiscountUnit?: number;
  tipAmount?: number;
}): CartTotals {
  const { config } = params;

  const subtotal = round2(
    params.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  );

  let deliveryFee = 0;
  let amountToFreeDelivery: number | null = null;

  if (params.orderType === "DELIVERY") {
    const qualifiesFree =
      config.freeDeliveryOver !== null &&
      config.freeDeliveryOver > 0 &&
      subtotal >= config.freeDeliveryOver;

    deliveryFee = qualifiesFree ? 0 : config.deliveryFee;

    if (config.freeDeliveryOver !== null && !qualifiesFree) {
      amountToFreeDelivery = round2(config.freeDeliveryOver - subtotal);
    }
  }

  const couponDiscount = round2(Math.min(params.couponDiscount ?? 0, subtotal));

  const pointsPerUnit = params.pointsPerDiscountUnit ?? 100;
  const pointsValue = round2((params.pointsToRedeem ?? 0) / pointsPerUnit);
  const pointsDiscount = round2(
    Math.min(pointsValue, Math.max(0, subtotal - couponDiscount)),
  );

  const discountAmount = round2(couponDiscount + pointsDiscount);
  const taxableBase = round2(Math.max(0, subtotal - discountAmount) + deliveryFee);

  // VAT is included in menu prices, so tax is extracted, not added.
  const tax = round2(taxableBase - taxableBase / (1 + config.taxRate / 100));
  const tipAmount = round2(Math.max(0, params.tipAmount ?? 0));

  return {
    subtotal,
    deliveryFee,
    couponDiscount,
    pointsDiscount,
    discountAmount,
    tax,
    tipAmount,
    total: round2(taxableBase + tipAmount),
    belowMinimum:
      params.orderType === "DELIVERY" && subtotal < config.minOrderAmount,
    amountToFreeDelivery,
  };
}
