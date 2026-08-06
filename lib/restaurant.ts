import { cache } from "react";

import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { OpeningHours } from "@/lib/utils";

export const RESTAURANT_SLUG = process.env.RESTAURANT_SLUG ?? "schnitzy-haus";

/**
 * Single-tenant today, multi-tenant-ready: everything resolves the restaurant
 * through here rather than hardcoding an id, so adding a second location means
 * changing this resolver instead of every query.
 *
 * `cache()` dedupes the lookup within a single server render pass.
 */
export const getRestaurant = cache(async () => {
  const restaurant =
    (await prisma.restaurant.findUnique({ where: { slug: RESTAURANT_SLUG } })) ??
    (await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } }));

  return restaurant;
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
