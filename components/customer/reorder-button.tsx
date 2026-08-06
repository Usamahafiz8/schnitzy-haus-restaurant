"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";

type ReorderLine = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  specialNotes?: string;
};

/**
 * Refills the cart from a past order. Lines whose dish has since been removed
 * from the menu are skipped, with a count so the customer knows.
 */
export function ReorderButton({ items }: { items: ReorderLine[] }) {
  const t = useTranslations("orders");
  const router = useRouter();
  const add = useCart((s) => s.add);

  const reorder = () => {
    const available = items.filter((item) => item.itemId);

    for (const item of available) {
      add(
        {
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          specialNotes: item.specialNotes,
        },
        item.quantity,
      );
    }

    const skipped = items.length - available.length;

    toast.success(t("reorder"), {
      description:
        skipped > 0
          ? `${available.length} added — ${skipped} no longer on the menu.`
          : `${available.length} item${available.length === 1 ? "" : "s"} added.`,
      action: { label: "Cart", onClick: () => router.push("/cart") },
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={reorder} disabled={items.length === 0}>
      <RotateCcw aria-hidden />
      {t("reorder")}
    </Button>
  );
}
