"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

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

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const cancel = async () => {
    setPending(true);
    try {
      const result = await postJson<{ refunded: boolean }>(
        `/orders/${orderId}/cancel`,
        { refund: true },
      );
      toast.success(t("cancelled"), {
        description: result.refunded ? "Your refund is on its way." : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive">
          <XCircle aria-hidden />
          {t("cancelOrder")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelOrder")}</DialogTitle>
          <DialogDescription>{t("cancelConfirm")}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {tCommon("back")}
          </Button>
          <Button variant="destructive" onClick={cancel} loading={pending}>
            {t("cancelOrder")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
