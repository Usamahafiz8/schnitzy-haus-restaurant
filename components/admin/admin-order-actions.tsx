"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiErrorMessage, postJson } from "@/lib/api-client";
import type { OrderStatus, PaymentStatus } from "@/types";

export function AdminOrderActions({
  orderId,
  status,
  orderType,
  paymentStatus,
  paymentMethod,
}: {
  orderId: string;
  status: OrderStatus;
  orderType: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [refunding, setRefunding] = useState(false);
  const [open, setOpen] = useState(false);

  const refundable =
    paymentStatus === "COMPLETED" &&
    paymentMethod === "STRIPE" &&
    status !== "CANCELLED";

  const refund = async () => {
    setRefunding(true);
    try {
      const result = await postJson<{ refunded: boolean }>(
        `/orders/${orderId}/cancel`,
        { refund: true, reason: "Refunded by restaurant" },
      );
      toast.success(
        result.refunded ? "Refunded and cancelled" : "Cancelled without refund",
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <div className="min-w-[220px] flex-1">
        <OrderStatusActions
          orderId={orderId}
          status={status}
          orderType={orderType}
          size="default"
          onChanged={() => {
            router.refresh();
            toast.success(tCommon("save"));
          }}
        />
      </div>

      <PrintButton label={t("printTicket")} variant="outline" size="default" />

      {refundable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <RotateCcw aria-hidden />
              {t("refund")}
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("refund")}</DialogTitle>
              <DialogDescription>{t("refundConfirm")}</DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={refunding}>
                {tCommon("cancel")}
              </Button>
              <Button variant="destructive" onClick={refund} loading={refunding}>
                {t("refund")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
