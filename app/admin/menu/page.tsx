import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { MenuManager } from "@/components/admin/menu-manager";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu", robots: { index: false } };

export default async function AdminMenuPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("menu")}</h1>

      <MenuManager
        categories={serialize(categories)}
        items={serialize(items)}
        locale={locale}
        currency={restaurant.currency}
      />
    </div>
  );
}
