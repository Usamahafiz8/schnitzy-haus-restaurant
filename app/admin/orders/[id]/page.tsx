import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin, Phone, User } from "lucide-react";

import { AdminOrderActions } from "@/components/admin/admin-order-actions";
import { KitchenTicket } from "@/components/admin/kitchen-ticket";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tOrders = await getTranslations("orders");
  const tCommon = await getTranslations("common");
  const restaurant = await requireRestaurant();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      review: { select: { id: true, rating: true, comment: true } },
    },
  });

  if (!order) notFound();

  const currency = restaurant.currency;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 no-print">
        <Link href="/admin/orders">
          <ArrowLeft aria-hidden />
          {t("orders")}
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.createdAt, locale)} ·{" "}
            {tOrders(`type.${order.orderType}`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <Badge variant="neutral">{order.paymentMethod}</Badge>
        </div>
      </header>

      <AdminOrderActions
        orderId={order.id}
        status={order.status}
        orderType={order.orderType}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{tOrders("items")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium tabular-nums">{item.quantity}×</span>{" "}
                    {item.name}
                    {item.specialNotes && (
                      <span className="block pl-5 text-xs italic text-amber-700 dark:text-amber-400">
                        {item.specialNotes}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(item.lineTotal, locale, currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1 border-t border-border pt-3 text-sm">
              <Row
                label={tCommon("subtotal")}
                value={formatCurrency(order.subtotal, locale, currency)}
              />
              {Number(order.deliveryFee) > 0 && (
                <Row
                  label={tCommon("delivery")}
                  value={formatCurrency(order.deliveryFee, locale, currency)}
                />
              )}
              {Number(order.discountAmount) > 0 && (
                <Row
                  label={`${tCommon("discount")}${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`−${formatCurrency(order.discountAmount, locale, currency)}`}
                />
              )}
              {order.pointsRedeemed > 0 && (
                <Row label="Points redeemed" value={`${order.pointsRedeemed}`} />
              )}
              {Number(order.tipAmount) > 0 && (
                <Row
                  label={tCommon("tip")}
                  value={formatCurrency(order.tipAmount, locale, currency)}
                />
              )}
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>{tCommon("total")}</dt>
                <dd>{formatCurrency(order.totalAmount, locale, currency)}</dd>
              </div>
              <p className="text-xs text-muted-foreground">
                {tCommon("tax")} · {formatCurrency(order.tax, locale, currency)}
              </p>
            </dl>

            {order.specialNotes && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {order.specialNotes}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" aria-hidden />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <a
                href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Phone className="size-3.5" aria-hidden />
                {order.customerPhone}
              </a>
              <p className="break-all text-muted-foreground">{order.customerEmail}</p>

              {order.customer ? (
                <Badge variant="neutral">Registered</Badge>
              ) : (
                <Badge variant="outline">Guest checkout</Badge>
              )}

              {order.deliveryAddress && (
                <div className="flex items-start gap-2 border-t border-border pt-2 text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    {order.deliveryAddress}
                    <br />
                    {order.deliveryPostalCode} {order.deliveryCity}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {order.statusHistory.map((event) => (
                  <li key={event.id} className="flex justify-between gap-3">
                    <span>{tOrders(`status.${event.status}`)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt, locale)}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {order.review && (
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{order.review.rating}/5</p>
                {order.review.comment && (
                  <p className="mt-1 text-muted-foreground">{order.review.comment}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <KitchenTicket
        order={{
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          createdAt: order.createdAt.toISOString(),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryCity: order.deliveryCity,
          deliveryPostalCode: order.deliveryPostalCode,
          specialNotes: order.specialNotes,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            specialNotes: item.specialNotes,
          })),
        }}
        restaurantName={restaurant.name}
      />
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
