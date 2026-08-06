"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { DishImage } from "@/components/shared/dish-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, Separator, Skeleton } from "@/components/ui/misc";
import { apiErrorMessage, postJson } from "@/lib/api-client";
import { computeCartTotals, type RestaurantPricingConfig } from "@/lib/cart-pricing";
import { useCart } from "@/lib/store/cart";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderType } from "@/types";

type CouponResult = { code: string; discountAmount: number; description?: string | null };

export function CartView({
  locale,
  config,
}: {
  locale: string;
  config: RestaurantPricingConfig;
}) {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // `couponCode` in the store is what checkout re-validates; this view renders
  // the freshly-validated coupon object below, so it isn't read here.
  const {
    lines,
    orderType,
    hydrated,
    increment,
    decrement,
    remove,
    setOrderType,
    setCoupon,
  } = useCart();

  const [codeInput, setCodeInput] = useState("");
  const [coupon, setCouponResult] = useState<CouponResult | null>(null);
  const [checking, setChecking] = useState(false);

  const totals = computeCartTotals({
    lines,
    orderType,
    config,
    couponDiscount: coupon?.discountAmount ?? 0,
  });

  const orderTypes = (
    [
      ["PICKUP", t("pickup"), config.pickupEnabled],
      ["DELIVERY", t("deliveryOption"), config.deliveryEnabled],
      ["DINE_IN", t("dineIn"), config.dineInEnabled],
    ] as const
  ).filter(([, , enabled]) => enabled);

  const applyCoupon = async () => {
    const code = codeInput.trim();
    if (!code) return;

    setChecking(true);
    try {
      const result = await postJson<CouponResult>("/coupons/validate", {
        code,
        subtotal: totals.subtotal,
      });
      setCouponResult(result);
      setCoupon(result.code);
      setCodeInput("");
      toast.success(t("couponApplied", { code: result.code }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null);
    setCoupon(null);
    toast(t("couponRemoved"));
  };

  // Until localStorage has been read the cart is empty on both sides; showing
  // skeletons instead of "your cart is empty" avoids a jarring flash.
  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={t("empty")}
        body={t("emptyBody")}
        action={
          <Button asChild>
            <Link href="/menu">{t("browseMenu")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------- order type */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("orderType")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {orderTypes.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setOrderType(value as OrderType)}
              aria-pressed={orderType === value}
              className={cn(
                "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                orderType === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* --------------------------------------------------------------- lines */}
      <ul className="space-y-3">
        {lines.map((line) => {
          const name = locale === "de" && line.nameDe ? line.nameDe : line.name;
          const key = `${line.itemId}-${line.specialNotes ?? ""}`;

          return (
            <li key={key}>
              <Card>
                <CardContent className="flex gap-3 p-3">
                  <DishImage
                    src={line.image}
                    alt={name}
                    sizes="80px"
                    className="size-20 shrink-0 overflow-hidden rounded-lg"
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(line.price, locale, config.currency)} {tCommon("of")} 1
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">
                        {formatCurrency(line.price * line.quantity, locale, config.currency)}
                      </p>
                    </div>

                    {line.specialNotes && (
                      <p className="mt-1 truncate text-xs italic text-muted-foreground">
                        “{line.specialNotes}”
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-lg border border-border">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => decrement(line.itemId, line.specialNotes)}
                          aria-label={`Decrease ${name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => increment(line.itemId, line.specialNotes)}
                          aria-label={`Increase ${name}`}
                        >
                          <Plus />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(line.itemId, line.specialNotes)}
                        aria-label={`${t("remove")} ${name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* -------------------------------------------------------------- coupon */}
      <Card>
        <CardContent className="p-4">
          {coupon ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Tag className="size-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{coupon.code}</p>
                  {coupon.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {coupon.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="success">
                  −{formatCurrency(coupon.discountAmount, locale, config.currency)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={removeCoupon}
                  aria-label={t("couponRemoved")}
                >
                  <X />
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void applyCoupon();
              }}
            >
              <Input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder={t("couponPlaceholder")}
                aria-label={t("couponPlaceholder")}
                autoComplete="off"
                maxLength={40}
              />
              <Button type="submit" variant="secondary" loading={checking}>
                {t("applyCoupon")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- totals */}
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <Row
            label={tCommon("subtotal")}
            value={formatCurrency(totals.subtotal, locale, config.currency)}
          />

          {orderType === "DELIVERY" && (
            <Row
              label={tCommon("delivery")}
              value={
                totals.deliveryFee === 0
                  ? tCommon("none")
                  : formatCurrency(totals.deliveryFee, locale, config.currency)
              }
            />
          )}

          {totals.discountAmount > 0 && (
            <Row
              label={tCommon("discount")}
              value={`−${formatCurrency(totals.discountAmount, locale, config.currency)}`}
              accent
            />
          )}

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between text-base font-semibold">
            <span>{tCommon("total")}</span>
            <span>{formatCurrency(totals.total, locale, config.currency)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {tCommon("tax")} · {formatCurrency(totals.tax, locale, config.currency)}
          </p>

          {totals.amountToFreeDelivery !== null && totals.amountToFreeDelivery > 0 && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {t("freeDeliveryOver", {
                amount: formatCurrency(
                  totals.amountToFreeDelivery,
                  locale,
                  config.currency,
                ),
              })}
            </p>
          )}

          {totals.belowMinimum && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {t("minOrder", {
                amount: formatCurrency(config.minOrderAmount, locale, config.currency),
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          size="lg"
          className="flex-1"
          disabled={totals.belowMinimum}
          onClick={() => router.push("/checkout")}
        >
          {t("checkout")}
        </Button>
        <Button size="lg" variant="outline" asChild className="flex-1">
          <Link href="/menu">{t("continueShopping")}</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(accent && "font-medium text-emerald-700 dark:text-emerald-400")}>
        {value}
      </span>
    </div>
  );
}
