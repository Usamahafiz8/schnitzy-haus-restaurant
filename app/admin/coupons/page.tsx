import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CouponsManager } from "@/components/admin/coupons-manager";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coupons", robots: { index: false } };

export default async function AdminCouponsPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const coupons = await prisma.coupon.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ isActive: "desc" }, { validTo: "desc" }],
    include: {
      _count: { select: { redemptions: true } },
      redemptions: { select: { amount: true } },
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("coupons")}</h1>

      <CouponsManager
        coupons={serialize(coupons).map(({ redemptions, ...coupon }) => ({
          ...coupon,
          totalDiscounted: redemptions.reduce((sum, r) => sum + toNumber(r.amount), 0),
        }))}
        locale={locale}
        currency={restaurant.currency}
      />
    </div>
  );
}
