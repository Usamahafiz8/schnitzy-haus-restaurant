import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";

import { NewOrderListener } from "@/components/admin/new-order-listener";
import { OrdersBoard } from "@/components/admin/orders-board";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const where: Prisma.OrderWhereInput = {
    restaurantId: restaurant.id,
    ...(params.status
      ? { status: params.status as Prisma.EnumOrderStatusFilter["equals"] }
      : {}),
    ...(params.q
      ? {
          OR: [
            { orderNumber: { contains: params.q, mode: "insensitive" } },
            { customerName: { contains: params.q, mode: "insensitive" } },
            { customerPhone: { contains: params.q } },
          ],
        }
      : {}),
  };

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId: restaurant.id },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-5">
      <NewOrderListener />

      <h1 className="text-2xl font-bold">{t("orders")}</h1>

      <OrdersBoard
        orders={serialize(orders)}
        counts={Object.fromEntries(counts.map((c) => [c.status, c._count]))}
        locale={locale}
        currency={restaurant.currency}
        initialStatus={params.status ?? null}
        initialQuery={params.q ?? ""}
      />
    </div>
  );
}
