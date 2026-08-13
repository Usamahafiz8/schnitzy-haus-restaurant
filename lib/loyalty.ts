import type { LoyaltyTier, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { toNumber } from "@/lib/utils";

type Db = PrismaClient | Prisma.TransactionClient;

export type TierThresholds = Record<Exclude<LoyaltyTier, "BRONZE">, number>;

export const DEFAULT_THRESHOLDS: TierThresholds = {
  SILVER: 250,
  GOLD: 1000,
  PLATINUM: 2500,
};

export const TIER_BENEFITS: Record<
  LoyaltyTier,
  { discountPct: number; perks: string[]; perksDe: string[] }
> = {
  BRONZE: {
    discountPct: 0,
    perks: ["Earn 1 point per €1 spent", "Birthday treat"],
    perksDe: ["1 Punkt pro € Umsatz", "Geburtstagsüberraschung"],
  },
  SILVER: {
    discountPct: 5,
    perks: ["5% off every order", "Priority pickup", "Early access to specials"],
    perksDe: ["5% auf jede Bestellung", "Bevorzugte Abholung", "Früher Zugang zu Specials"],
  },
  GOLD: {
    discountPct: 10,
    perks: ["10% off every order", "Free delivery", "Complimentary dessert monthly"],
    perksDe: ["10% auf jede Bestellung", "Kostenlose Lieferung", "Monatlich ein Dessert gratis"],
  },
  PLATINUM: {
    discountPct: 15,
    perks: ["15% off every order", "Free delivery", "Guaranteed table booking", "Chef's table invites"],
    perksDe: ["15% auf jede Bestellung", "Kostenlose Lieferung", "Garantierte Tischreservierung", "Einladungen zum Chef's Table"],
  },
};

export const TIER_ORDER: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

export function parseThresholds(raw: unknown): TierThresholds {
  if (!raw || typeof raw !== "object") return DEFAULT_THRESHOLDS;
  const value = raw as Partial<Record<string, unknown>>;
  return {
    SILVER: Number(value.SILVER ?? DEFAULT_THRESHOLDS.SILVER),
    GOLD: Number(value.GOLD ?? DEFAULT_THRESHOLDS.GOLD),
    PLATINUM: Number(value.PLATINUM ?? DEFAULT_THRESHOLDS.PLATINUM),
  };
}

/** Tier is a function of lifetime spend, so it never drops after a redemption. */
export function tierForSpend(
  totalSpent: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS,
): LoyaltyTier {
  if (totalSpent >= thresholds.PLATINUM) return "PLATINUM";
  if (totalSpent >= thresholds.GOLD) return "GOLD";
  if (totalSpent >= thresholds.SILVER) return "SILVER";
  return "BRONZE";
}

export function nextTier(tier: LoyaltyTier): LoyaltyTier | null {
  const index = TIER_ORDER.indexOf(tier);
  return index >= 0 && index < TIER_ORDER.length - 1 ? TIER_ORDER[index + 1] : null;
}

export function progressToNextTier(
  totalSpent: number,
  tier: LoyaltyTier,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS,
): { next: LoyaltyTier | null; remaining: number; percent: number } {
  const next = nextTier(tier);
  if (!next) return { next: null, remaining: 0, percent: 100 };

  const target = thresholds[next as keyof TierThresholds];
  const floor =
    tier === "BRONZE" ? 0 : thresholds[tier as keyof TierThresholds] ?? 0;
  const span = Math.max(1, target - floor);
  const progressed = Math.max(0, totalSpent - floor);

  return {
    next,
    remaining: Math.max(0, target - totalSpent),
    percent: Math.min(100, Math.round((progressed / span) * 100)),
  };
}

export async function getOrCreateLoyaltyAccount(
  db: Db,
  restaurantId: string,
  customerId: string,
) {
  const existing = await db.loyaltyAccount.findUnique({
    where: { restaurantId_customerId: { restaurantId, customerId } },
  });
  if (existing) return existing;

  return db.loyaltyAccount.create({
    data: { restaurantId, customerId },
  });
}

/**
 * Applies a points delta and records the transaction. Positive earns, negative
 * redeems. Always call inside the same transaction as the order write so points
 * and orders can never disagree.
 */
export async function recordPoints(
  db: Db,
  params: {
    restaurantId: string;
    customerId: string;
    points: number;
    reason: "EARNED_ORDER" | "REDEEMED" | "MANUAL_ADJUSTMENT" | "SIGNUP_BONUS" | "EXPIRED";
    orderId?: string;
    note?: string;
    spendDelta?: number;
    thresholds?: TierThresholds;
  },
) {
  const account = await getOrCreateLoyaltyAccount(
    db,
    params.restaurantId,
    params.customerId,
  );

  const newBalance = Math.max(0, account.points + params.points);
  const spendDelta = params.spendDelta ?? 0;
  const newSpend = toNumber(account.totalSpent) + spendDelta;
  const tier = tierForSpend(newSpend, params.thresholds ?? DEFAULT_THRESHOLDS);

  const updated = await db.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      points: newBalance,
      lifetimePoints:
        params.points > 0
          ? account.lifetimePoints + params.points
          : account.lifetimePoints,
      totalSpent: newSpend,
      tier,
      orderCount: params.reason === "EARNED_ORDER" ? account.orderCount + 1 : account.orderCount,
      lastRedeemDate: params.points < 0 ? new Date() : account.lastRedeemDate,
    },
  });

  await db.pointsTransaction.create({
    data: {
      accountId: account.id,
      userId: params.customerId,
      orderId: params.orderId,
      points: params.points,
      reason: params.reason,
      note: params.note,
    },
  });

  return { account: updated, tierChanged: updated.tier !== account.tier };
}

export async function loyaltySummary(restaurantId: string, customerId: string) {
  // Loyalty rates and tier thresholds are hardcoded (lib/restaurant-config.ts)
  // now — only the account balance itself is still a database lookup.
  const account = await prisma.loyaltyAccount.findUnique({
    where: { restaurantId_customerId: { restaurantId, customerId } },
  });

  const thresholds = parseThresholds(RESTAURANT_CONFIG.tierThresholds);
  const points = account?.points ?? 0;
  const totalSpent = toNumber(account?.totalSpent ?? 0);
  const tier = account?.tier ?? "BRONZE";
  const pointsPerUnit = RESTAURANT_CONFIG.pointsPerDiscountUnit;

  return {
    points,
    lifetimePoints: account?.lifetimePoints ?? 0,
    tier,
    totalSpent,
    orderCount: account?.orderCount ?? 0,
    pointsValue: Math.floor((points / pointsPerUnit) * 100) / 100,
    pointsPerDiscountUnit: pointsPerUnit,
    pointsPerCurrency: RESTAURANT_CONFIG.pointsPerCurrency,
    benefits: TIER_BENEFITS[tier],
    thresholds,
    ...progressToNextTier(totalSpent, tier, thresholds),
  };
}
