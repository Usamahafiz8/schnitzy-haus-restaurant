import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin, Phone } from "lucide-react";

import { PrintButton } from "@/components/shared/print-button";

import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { OrderTracker } from "@/components/customer/order-tracker";
import { ReorderButton } from "@/components/customer/reorder-button";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CUSTOMER_CANCELLABLE } from "@/lib/orders";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { serialize } from "@/lib/serialize";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function OrderDetailPage({
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
      review: { select: { id: true, rating: true } },
    },
  });

  if (!order) notFound();

  const user = await currentUser();
  const allowed =
    order.customerId === null ||
    (user && (order.customerId === user.id || STAFF_ROLES.includes(user.role)));

  if (!allowed) notFound();

  const canCancel =
    user &&
    order.customerId === user.id &&
    CUSTOMER_CANCELLABLE.includes(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 no-print">
        <Link href="/orders">
          <ArrowLeft aria-hidden />
          {t("title")}
        </Link>
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {t("placedOn", { date: formatDateTime(order.createdAt, locale) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </header>

      <OrderTracker
        orderId={order.id}
        initialStatus={order.status}
        orderType={order.orderType}
        estimatedTime={order.estimatedDeliveryTime?.toISOString() ?? null}
        history={serialize(order.statusHistory)}
      />

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

          <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
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
                label={`${tCommon("discount")}${order.couponCode ? ` (${order.couponCode})` : ""}`}
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
              <dt>{tCommon("total")}</dt>
              <dd>{formatCurrency(order.totalAmount, locale, RESTAURANT_CONFIG.currency)}</dd>
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon("tax")} ·{" "}
              {formatCurrency(order.tax, locale, RESTAURANT_CONFIG.currency)} ·{" "}
              {order.paymentMethod === "STRIPE" ? "Card" : "Cash"}
            </p>
          </dl>
        </CardContent>
      </Card>

      {order.orderType === "DELIVERY" && order.deliveryAddress && (
        <Card className="mt-4">
          <CardContent className="flex items-start gap-3 p-5 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-muted-foreground">
                {order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}
              </p>
              <p className="text-muted-foreground">{order.customerPhone}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {order.specialNotes && (
        <Card className="mt-4">
          <CardContent className="p-5 text-sm">
            <p className="font-medium">{tCommon("notes")}</p>
            <p className="mt-1 text-muted-foreground">{order.specialNotes}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-2 no-print">
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
          <Button size="sm" variant="outline" asChild>
            <Link href={`/reviews?orderId=${order.id}`}>{t("leaveReview")}</Link>
          </Button>
        )}

        <PrintButton label={t("printReceipt")} />

        <Button size="sm" variant="ghost" asChild>
          <a href={`tel:${RESTAURANT_CONFIG.phone.replace(/\s/g, "")}`}>
            <Phone aria-hidden />
            {RESTAURANT_CONFIG.phone}
          </a>
        </Button>

        {canCancel && <CancelOrderButton orderId={order.id} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

