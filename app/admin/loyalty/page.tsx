import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LoyaltyMembers } from "@/components/admin/loyalty-members";
import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/db";
import { parseThresholds } from "@/lib/loyalty";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { formatCurrency, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loyalty", robots: { index: false } };

export default async function AdminLoyaltyPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tLoyalty = await getTranslations("loyalty");
  const restaurant = await requireRestaurant();

  const [members, byTier, aggregate] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { totalSpent: "desc" },
      take: 100,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.loyaltyAccount.groupBy({
      by: ["tier"],
      where: { restaurantId: restaurant.id },
      _count: true,
    }),
    prisma.loyaltyAccount.aggregate({
      where: { restaurantId: restaurant.id },
      _sum: { points: true, totalSpent: true },
    }),
  ]);

  const tierCounts = Object.fromEntries(byTier.map((row) => [row.tier, row._count]));
  const outstanding = aggregate._sum.points ?? 0;
  const liability = outstanding / restaurant.pointsPerDiscountUnit;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("loyalty")}</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("members")} value={members.length} accent />
        <StatCard
          label="Outstanding points"
          value={outstanding.toLocaleString()}
          hint={`≈ ${formatCurrency(liability, locale, restaurant.currency)} liability`}
        />
        <StatCard
          label={tLoyalty("totalSpent")}
          value={formatCurrency(
            toNumber(aggregate._sum.totalSpent ?? 0),
            locale,
            restaurant.currency,
          )}
        />
        <StatCard
          label={`${tLoyalty("tiers.GOLD")} + ${tLoyalty("tiers.PLATINUM")}`}
          value={(tierCounts.GOLD ?? 0) + (tierCounts.PLATINUM ?? 0)}
        />
      </div>

      <LoyaltyMembers
        members={serialize(members)}
        tierCounts={tierCounts}
        thresholds={parseThresholds(restaurant.tierThresholds)}
        locale={locale}
        currency={restaurant.currency}
      />
    </div>
  );
}
