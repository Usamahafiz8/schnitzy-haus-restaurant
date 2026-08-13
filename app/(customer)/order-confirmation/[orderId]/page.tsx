import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Receipt, UtensilsCrossed } from "lucide-react";

import { OrderTracker } from "@/components/customer/order-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { serialize } from "@/lib/serialize";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false } };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("orders");
  const tCommon = await getTranslations("common");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const user = await currentUser();
  const allowed =
    order.customerId === null ||
    (user && (order.customerId === user.id || STAFF_ROLES.includes(user.role)));

  if (!allowed) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-7 text-emerald-600" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t("confirmation")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("confirmationBody", { email: order.customerEmail })}
        </p>
        <p className="mt-3 font-mono text-sm font-medium">{order.orderNumber}</p>
      </div>

      <div className="mt-8">
        <OrderTracker
          orderId={order.id}
          initialStatus={order.status}
          orderType={order.orderType}
          estimatedTime={order.estimatedDeliveryTime?.toISOString() ?? null}
          history={serialize(order.statusHistory)}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">{t("items")}</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.quantity}× {item.name}
                  {item.specialNotes && (
                    <span className="block text-xs italic text-muted-foreground">
                      {item.specialNotes}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(item.lineTotal, locale, RESTAURANT_CONFIG.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <Row
              label={tCommon("subtotal")}
              value={formatCurrency(order.subtotal, locale, RESTAURANT_CONFIG.currency)}
            />
            {Number(order.deliveryFee) > 0 && (
              <Row
                label={tCommon("delivery")}
                value={formatCurrency(order.deliveryFee, locale, RESTAURANT_CONFIG.currency)}
              />
            )}
            {Number(order.discountAmount) > 0 && (
              <Row
                label={tCommon("discount")}
                value={`−${formatCurrency(order.discountAmount, locale, RESTAURANT_CONFIG.currency)}`}
              />
            )}
            {Number(order.tipAmount) > 0 && (
              <Row
                label={tCommon("tip")}
                value={formatCurrency(order.tipAmount, locale, RESTAURANT_CONFIG.currency)}
              />
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <span>{tCommon("total")}</span>
              <span>
                {formatCurrency(order.totalAmount, locale, RESTAURANT_CONFIG.currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon("tax")} ·{" "}
              {formatCurrency(order.tax, locale, RESTAURANT_CONFIG.currency)}
            </p>
          </div>

          {order.estimatedDeliveryTime && (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm">
              {order.orderType === "DELIVERY"
                ? t("estimatedDelivery")
                : t("estimatedReady")}
              :{" "}
              <strong>{formatDateTime(order.estimatedDeliveryTime, locale)}</strong>
            </p>
          )}

          {order.pointsEarned > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              +{order.pointsEarned} points once this order completes.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={`/orders/${order.id}`}>
            <Receipt aria-hidden />
            {t("trackOrder")}
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/menu">
            <UtensilsCrossed aria-hidden />
            {t("reorder")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
