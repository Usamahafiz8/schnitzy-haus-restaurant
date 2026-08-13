import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Receipt, Star } from "lucide-react";

import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { ReorderButton } from "@/components/customer/reorder-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { serialize } from "@/lib/serialize";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title"), robots: { index: false } };
}

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/login?callbackUrl=/orders");

  const locale = await getLocale();
  const t = await getTranslations("orders");

  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: true,
      review: { select: { id: true, rating: true } },
    },
  });

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
        <EmptyState
          icon={Receipt}
          title={t("empty")}
          body={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/menu">{t("reorder")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>

      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt, locale)} ·{" "}
                      {t(`type.${order.orderType}`)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <span className="font-semibold">
                      {formatCurrency(order.totalAmount, locale, RESTAURANT_CONFIG.currency)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {order.items
                    .map((item) => `${item.quantity}× ${item.name}`)
                    .join(", ")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/orders/${order.id}`}>{t("viewDetails")}</Link>
                  </Button>

                  <ReorderButton
                    items={serialize(order.items).map((item) => ({
                      itemId: item.menuItemId ?? "",
                      name: item.name,
                      price: item.unitPrice,
                      quantity: item.quantity,
                      specialNotes: item.specialNotes ?? undefined,
                    }))}
                  />

                  {order.status === "DELIVERED" && !order.review && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/reviews?orderId=${order.id}`}>
                        <Star aria-hidden />
                        {t("leaveReview")}
                      </Link>
                    </Button>
                  )}

                  {order.review && (
                    <span className="flex items-center gap-1 self-center text-sm text-muted-foreground">
                      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                      {order.review.rating}/5
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
