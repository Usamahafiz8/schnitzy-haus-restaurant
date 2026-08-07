"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Check, ChefHat, CircleDot, Package, Truck, XCircle } from "lucide-react";

import { cn, formatTime } from "@/lib/utils";
import type { OrderStatus } from "@/types";

type StatusEvent = { status: OrderStatus; createdAt: string; note?: string | null };

const PICKUP_STEPS: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];
const DELIVERY_STEPS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const ICONS: Partial<Record<OrderStatus, React.ComponentType<{ className?: string }>>> = {
  PENDING: CircleDot,
  CONFIRMED: Check,
  PREPARING: ChefHat,
  READY: Package,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: Check,
};

/**
 * Live status via Server-Sent Events. EventSource reconnects on its own, so a
 * dropped connection recovers without any retry logic here; the periodic
 * `router.refresh()` on reconnect closes the gap for anything missed offline.
 */
export function OrderTracker({
  orderId,
  initialStatus,
  orderType,
  estimatedTime,
  history,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  orderType: string;
  estimatedTime: string | null;
  history: StatusEvent[];
}) {
  const t = useTranslations("orders");
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [events, setEvents] = useState<StatusEvent[]>(history);
  const [live, setLive] = useState(false);

  useEffect(() => {
    // Terminal orders never change again — don't hold a connection open.
    if (status === "DELIVERED" || status === "CANCELLED") return;

    const source = new EventSource(`/api/orders/${orderId}/events`);

    source.onopen = () => setLive(true);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          kind: string;
          status?: OrderStatus;
          at?: string;
        };

        if (payload.kind === "connected") {
          setLive(true);
          return;
        }

        if (payload.kind === "order-status" && payload.status) {
          setStatus(payload.status);
          setEvents((prev) => [
            ...prev,
            { status: payload.status!, createdAt: payload.at ?? new Date().toISOString() },
          ]);
          // Pull the rest of the order (totals, times) back in sync.
          router.refresh();
        }
      } catch {
        // A malformed frame shouldn't tear down the stream.
      }
    };

    source.onerror = () => setLive(false);

    return () => source.close();
  }, [orderId, status, router]);

  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-[--radius-card] border border-destructive/40 bg-destructive/5 p-4">
        <XCircle className="size-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="font-medium text-destructive">{t("status.CANCELLED")}</p>
          <p className="text-sm text-muted-foreground">
            {events.find((e) => e.status === "CANCELLED")?.note ?? ""}
          </p>
        </div>
      </div>
    );
  }

  const steps = orderType === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = steps.indexOf(status);
  const timeFor = (step: OrderStatus) =>
    events.find((e) => e.status === step)?.createdAt;

  return (
    <div className="rounded-[--radius-card] border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold">{t("trackOrder")}</h2>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            live ? "text-emerald-700 " : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              live ? "animate-pulse bg-emerald-500" : "bg-muted-foreground",
            )}
            aria-hidden
          />
          {live ? "Live" : "Reconnecting…"}
        </span>
      </div>

      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const Icon = ICONS[step] ?? CircleDot;
          const at = timeFor(step);

          return (
            <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-full w-0.5",
                    done ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden
                />
              )}

              <span
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-card text-primary",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "animate-pulse")} />
              </span>

              <div className="min-w-0 pt-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {t(`status.${step}`)}
                </p>
                {at && (
                  <p className="text-xs text-muted-foreground">{formatTime(at)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {estimatedTime && status !== "DELIVERED" && (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
          {orderType === "DELIVERY" ? t("estimatedDelivery") : t("estimatedReady")}:{" "}
          <strong>{formatTime(estimatedTime)}</strong>
        </p>
      )}
    </div>
  );
}
