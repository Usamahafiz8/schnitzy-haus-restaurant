"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Check, Copy, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number | null;
  validTo: string;
};

export function CouponList({
  coupons,
  locale,
  currency,
}: {
  coupons: Coupon[];
  locale: string;
  currency: string;
}) {
  const t = useTranslations("loyalty");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(t("copied"), { description: code });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is unavailable over plain HTTP; the code is on screen anyway.
      toast.error("Copy the code manually");
    }
  };

  if (coupons.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{t("noCoupons")}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {coupons.map((coupon) => (
        <li
          key={coupon.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-brand-50/50 p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Tag className="size-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-mono font-semibold">{coupon.code}</p>
              <p className="truncate text-xs text-muted-foreground">
                {coupon.description ??
                  (coupon.discountType === "PERCENTAGE"
                    ? `${coupon.discountValue}% off`
                    : `${formatCurrency(coupon.discountValue, locale, currency)} off`)}
                {coupon.minOrderAmount
                  ? ` · min ${formatCurrency(coupon.minOrderAmount, locale, currency)}`
                  : ""}
                {` · until ${formatDate(coupon.validTo, locale)}`}
              </p>
            </div>
          </div>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => copy(coupon.code)}
            aria-label={`${t("copyCode")}: ${coupon.code}`}
          >
            {copied === coupon.code ? <Check className="text-emerald-600" /> : <Copy />}
          </Button>
        </li>
      ))}
    </ul>
  );
}
