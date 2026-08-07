"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Phone, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatCurrency, formatTime } from "@/lib/utils";
import type { OrderStatus } from "@/types";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paymentMethod: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostalCode: string | null;
  specialNotes: string | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; specialNotes: string | null }[];
};

// Live tickets first — the statuses staff actually act on.
const ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

const FILTERS: (OrderStatus | "ALL" | "ACTIVE")[] = [
  "ACTIVE",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "ALL",
];

export function OrdersBoard({
  orders,
  counts,
  locale,
  currency,
  initialStatus,
  initialQuery,
}: {
  orders: OrderRow[];
  counts: Record<string, number>;
  locale: string;
  currency: string;
  initialStatus: string | null;
  initialQuery: string;
}) {
  const t = useTranslations("admin");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [filter, setFilter] = useState<string>(initialStatus ?? "ACTIVE");
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (filter === "ACTIVE" && !ACTIVE.includes(order.status)) return false;
      if (filter !== "ALL" && filter !== "ACTIVE" && order.status !== filter) return false;

      if (needle) {
        const haystack =
          `${order.orderNumber} ${order.customerName} ${order.customerPhone}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [orders, filter, query]);

  const countFor = (key: string) => {
    if (key === "ALL") return orders.length;
    if (key === "ACTIVE") {
      return ACTIVE.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
    }
    return counts[key] ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order number, name or phone…"
            className="pl-9"
            aria-label={tCommon("search")}
          />
        </div>
      </div>

      <div className="scroll-x no-scrollbar -mx-1 flex gap-2 px-1 pb-1">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {key === "ALL"
              ? tCommon("all")
              : key === "ACTIVE"
                ? t("pendingOrders")
                : tOrders(`status.${key}`)}
            <span className="tabular-nums opacity-70">{countFor(key)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={t("noData")} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <li key={order.id}>
              <Card className={cn(order.status === "PENDING" && "border-warning/60")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-sm font-semibold hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(order.createdAt, locale)} ·{" "}
                        {tOrders(`type.${order.orderType as "PICKUP"}`)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="text-sm">
                    <p className="truncate font-medium">{order.customerName}</p>
                    <a
                      href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3" aria-hidden />
                      {order.customerPhone}
                    </a>
                    {order.deliveryAddress && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {order.deliveryAddress}, {order.deliveryPostalCode}{" "}
                        {order.deliveryCity}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-0.5 border-t border-border pt-2 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-medium tabular-nums">{item.quantity}×</span>{" "}
                        {item.name}
                        {item.specialNotes && (
                          <span className="block pl-5 text-xs italic text-amber-700">
                            {item.specialNotes}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {order.specialNotes && (
                    <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                      {order.specialNotes}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <Badge variant="neutral">{order.paymentMethod}</Badge>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(order.totalAmount, locale, currency)}
                    </span>
                  </div>

                  <OrderStatusActions
                    orderId={order.id}
                    status={order.status}
                    orderType={order.orderType}
                    onChanged={() => {
                      router.refresh();
                      toast.success(tCommon("save"));
                    }}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
