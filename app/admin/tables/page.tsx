import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { TablesManager } from "@/components/admin/tables-manager";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tables", robots: { index: false } };

export default async function AdminTablesPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ isActive: "desc" }, { number: "asc" }],
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
          endsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 2,
        select: {
          id: true,
          startsAt: true,
          numberOfGuests: true,
          customerName: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("tables")}</h1>
      <TablesManager tables={serialize(tables)} locale={locale} />
    </div>
  );
}
