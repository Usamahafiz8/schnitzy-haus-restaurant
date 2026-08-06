"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Check, ChefHat, Package, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiErrorMessage, putJson } from "@/lib/api-client";
import type { OrderStatus } from "@/types";

type Action = {
  to: OrderStatus;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "destructive";
};

/**
 * Only offers moves the server will actually accept — the same transition table
 * as `lib/orders.ts`, so a button never produces a 409.
 */
function actionsFor(status: OrderStatus, orderType: string): Action[] {
  switch (status) {
    case "PENDING":
      return [
        { to: "CONFIRMED", labelKey: "acceptOrder", icon: Check },
        { to: "CANCELLED", labelKey: "rejectOrder", icon: X, variant: "destructive" },
      ];
    case "CONFIRMED":
      return [{ to: "PREPARING", labelKey: "markPreparing", icon: ChefHat }];
    case "PREPARING":
      return [{ to: "READY", labelKey: "markReady", icon: Package }];
    case "READY":
      return orderType === "DELIVERY"
        ? [{ to: "OUT_FOR_DELIVERY", labelKey: "markOutForDelivery", icon: Truck }]
        : [{ to: "DELIVERED", labelKey: "markDelivered", icon: Check }];
    case "OUT_FOR_DELIVERY":
      return [{ to: "DELIVERED", labelKey: "markDelivered", icon: Check }];
    default:
      return [];
  }
}

export function OrderStatusActions({
  orderId,
  status,
  orderType,
  onChanged,
  size = "sm",
}: {
  orderId: string;
  status: OrderStatus;
  orderType: string;
  onChanged: () => void;
  size?: "sm" | "default";
}) {
  const t = useTranslations("admin");
  const [pending, setPending] = useState<OrderStatus | null>(null);

  const actions = actionsFor(status, orderType);
  if (actions.length === 0) return null;

  const move = async (to: OrderStatus) => {
    setPending(to);
    try {
      await putJson(`/orders/${orderId}/status`, { status: to });
      onChanged();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.to}
            size={size}
            variant={action.variant ?? "default"}
            loading={pending === action.to}
            disabled={pending !== null}
            onClick={() => move(action.to)}
            className={action.variant === "destructive" ? "" : "flex-1"}
          >
            <Icon aria-hidden />
            {t(action.labelKey)}
          </Button>
        );
      })}
    </div>
  );
}
