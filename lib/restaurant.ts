import { cache } from "react";

import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import type { OpeningHours } from "@/lib/utils";

export const RESTAURANT_SLUG = RESTAURANT_CONFIG.slug;

/**
 * The profile is hardcoded (lib/restaurant-config.ts); the database only
 * holds `id` (the FK anchor every order/booking/review/etc. points at) and
 * `isActive` (the one live "stop accepting orders" switch). This merges the
 * two so every existing caller — which just reads `restaurant.name`,
 * `restaurant.taxRate`, and so on — keeps working unchanged.
 *
 * `cache()` dedupes the lookup within a single server render pass.
 */
export const getRestaurant = cache(async () => {
  const row =
    (await prisma.restaurant.findUnique({ where: { slug: RESTAURANT_SLUG } })) ??
    (await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!row) return null;

  return {
    ...RESTAURANT_CONFIG,
    id: row.id,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
});

export async function requireRestaurant() {
  const restaurant = await getRestaurant();
  if (!restaurant) {
    throw notFound("No restaurant has been configured. Run `pnpm db:seed`.");
  }
  return restaurant;
}

export async function getRestaurantId(): Promise<string> {
  const restaurant = await requireRestaurant();
  return restaurant.id;
}

export function openingHoursOf(restaurant: { openingHours: unknown }): OpeningHours {
  return (restaurant.openingHours ?? {}) as OpeningHours;
}
