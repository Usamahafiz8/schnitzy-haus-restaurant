import Stripe from "stripe";

import { captureMessage } from "@/lib/monitoring";

let cachedClient: Stripe | null = null;

/** Returns null when Stripe isn't configured so cash-only setups still work. */
export function stripe(): Stripe | null {
  if (cachedClient) return cachedClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    captureMessage("STRIPE_SECRET_KEY is not set — card payments are disabled");
    return null;
  }

  cachedClient = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    appInfo: { name: "Schnitzy Haus", version: "1.0.0" },
  });

  return cachedClient;
}

export function requireStripe(): Stripe {
  const client = stripe();
  if (!client) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  return client;
}

export const isStripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Stripe works in the smallest currency unit; EUR means cents. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amount: number): number {
  return Math.round(amount) / 100;
}
