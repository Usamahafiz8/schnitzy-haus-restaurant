"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { BookingStatus, OrderStatus, PaymentStatus } from "@/types";

const ORDER_VARIANTS: Record<
  OrderStatus,
  "default" | "neutral" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "default",
  READY: "success",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "neutral",
  CANCELLED: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("orders");
  return <Badge variant={ORDER_VARIANTS[status]}>{t(`status.${status}`)}</Badge>;
}

const PAYMENT_VARIANTS: Record<PaymentStatus, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = useTranslations("orders");
  return <Badge variant={PAYMENT_VARIANTS[status]}>{t(`payment.${status}`)}</Badge>;
}

const BOOKING_VARIANTS: Record<
  BookingStatus,
  "default" | "neutral" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  CONFIRMED: "success",
  SEATED: "info",
  CANCELLED: "danger",
  COMPLETED: "neutral",
  NO_SHOW: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("bookings");
  return <Badge variant={BOOKING_VARIANTS[status]}>{t(`status.${status}`)}</Badge>;
}
