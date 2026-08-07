"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Banknote, CreditCard, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { StripePayment } from "@/components/customer/stripe-payment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox, EmptyState, Separator } from "@/components/ui/misc";
import { apiErrorMessage, apiFieldErrors, postJson } from "@/lib/api-client";
import { computeCartTotals, type RestaurantPricingConfig } from "@/lib/cart-pricing";
import { useCart } from "@/lib/store/cart";
import { cn, formatCurrency } from "@/lib/utils";

type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

type CreatedOrder = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: "STRIPE" | "CASH";
  clientSecret: string | null;
};

const TIP_PRESETS = [0, 0.05, 0.1, 0.15];

export function CheckoutForm({
  locale,
  isSignedIn,
  defaults,
  addresses,
  loyalty,
  config,
  stripeEnabled,
}: {
  locale: string;
  isSignedIn: boolean;
  defaults: { customerName: string; customerEmail: string; customerPhone: string };
  addresses: Address[];
  loyalty: { points: number; pointsValue: number; pointsPerDiscountUnit: number } | null;
  config: RestaurantPricingConfig;
  stripeEnabled: boolean;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { lines, orderType, couponCode, hydrated, clear } = useCart();

  const [contact, setContact] = useState(defaults);
  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [newAddress, setNewAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "CASH">(
    stripeEnabled ? "STRIPE" : "CASH",
  );
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [tipRate, setTipRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);

  const usingNewAddress = addressId === null;
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  const baseTotals = computeCartTotals({ lines, orderType, config });
  const tipAmount = Math.round(baseTotals.subtotal * tipRate * 100) / 100;

  const totals = computeCartTotals({
    lines,
    orderType,
    config,
    pointsToRedeem,
    pointsPerDiscountUnit: loyalty?.pointsPerDiscountUnit,
    tipAmount,
  });

  // Points can't discount more than the order is worth, so cap the slider at
  // whatever the cart can actually absorb.
  const maxRedeemablePoints = useMemo(() => {
    if (!loyalty) return 0;
    const capByCart = Math.floor(baseTotals.subtotal * loyalty.pointsPerDiscountUnit);
    return Math.max(0, Math.min(loyalty.points, capByCart));
  }, [loyalty, baseTotals.subtotal]);

  const submit = async () => {
    setErrors({});

    if (orderType === "DELIVERY") {
      if (usingNewAddress && (!newAddress.line1 || !newAddress.city || !newAddress.postalCode)) {
        setErrors({ deliveryAddress: "Enter a full delivery address" });
        return;
      }
      if (!usingNewAddress && !selectedAddress) {
        setErrors({ deliveryAddress: "Choose a delivery address" });
        return;
      }
    }

    setSubmitting(true);

    try {
      const address = usingNewAddress ? newAddress : selectedAddress;

      // Save the typed address first so it's there next time.
      if (isSignedIn && orderType === "DELIVERY" && usingNewAddress && saveAddress) {
        await postJson("/addresses", {
          label: "Home",
          line1: newAddress.line1,
          line2: newAddress.line2 || undefined,
          city: newAddress.city,
          postalCode: newAddress.postalCode,
          country: "DE",
          isDefault: addresses.length === 0,
        }).catch(() => undefined);
      }

      const created = await postJson<CreatedOrder>("/orders", {
        items: lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          specialNotes: line.specialNotes,
        })),
        orderType,
        paymentMethod,
        couponCode: couponCode || undefined,
        pointsToRedeem,
        tipAmount,
        customerName: contact.customerName,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        ...(orderType === "DELIVERY" && address
          ? {
              deliveryAddress: [address.line1, address.line2].filter(Boolean).join(", "),
              deliveryCity: address.city,
              deliveryPostalCode: address.postalCode,
              ...(selectedAddress?.latitude && selectedAddress?.longitude
                ? {
                    deliveryLat: selectedAddress.latitude,
                    deliveryLng: selectedAddress.longitude,
                  }
                : {}),
            }
          : {}),
        specialNotes: notes || undefined,
      });

      if (created.paymentMethod === "CASH" || !created.clientSecret) {
        clear();
        router.push(`/order-confirmation/${created.id}`);
        return;
      }

      // Card orders stay on the page for the Stripe element; the cart is only
      // cleared once payment actually succeeds.
      setOrder(created);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);
      setErrors(fieldErrors);
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lines.length === 0 && !order) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={tCart("empty")}
        body={tCart("emptyBody")}
        action={
          <Button asChild>
            <Link href="/menu">{tCart("browseMenu")}</Link>
          </Button>
        }
      />
    );
  }

  // ------------------------------------------------------------ payment step
  if (order?.clientSecret) {
    return (
      <StripePayment
        clientSecret={order.clientSecret}
        orderId={order.id}
        orderNumber={order.orderNumber}
        amount={order.totalAmount}
        locale={locale}
        currency={config.currency}
        onSucceeded={() => clear()}
      />
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* ------------------------------------------------------------ contact */}
      <Card>
        <CardHeader>
          <CardTitle>{t("contact")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label={tCommon("name")}
            htmlFor="customerName"
            required
            error={errors.customerName}
            className="sm:col-span-2"
          >
            <Input
              value={contact.customerName}
              onChange={(e) => setContact({ ...contact, customerName: e.target.value })}
              autoComplete="name"
              required
            />
          </Field>

          <Field label={tCommon("email")} htmlFor="customerEmail" required error={errors.customerEmail}>
            <Input
              type="email"
              value={contact.customerEmail}
              onChange={(e) => setContact({ ...contact, customerEmail: e.target.value })}
              autoComplete="email"
              inputMode="email"
              required
            />
          </Field>

          <Field label={tCommon("phone")} htmlFor="customerPhone" required error={errors.customerPhone}>
            <Input
              type="tel"
              value={contact.customerPhone}
              onChange={(e) => setContact({ ...contact, customerPhone: e.target.value })}
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </Field>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------- delivery */}
      {orderType === "DELIVERY" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("deliveryAddress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => setAddressId(address.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      addressId === address.id
                        ? "border-primary bg-brand-50 "
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 size-4 shrink-0 rounded-full border-2",
                        addressId === address.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {address.label}
                        {address.isDefault && (
                          <Badge variant="neutral">{tCommon("yes")}</Badge>
                        )}
                      </span>
                      <span className="block text-muted-foreground">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.postalCode}{" "}
                        {address.city}
                      </span>
                    </span>
                  </button>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddressId(null)}
                  className={cn(usingNewAddress && "text-primary")}
                >
                  {t("newAddress")}
                </Button>
              </div>
            )}

            {(usingNewAddress || addresses.length === 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("street")}
                  htmlFor="line1"
                  required
                  error={errors.deliveryAddress}
                  className="sm:col-span-2"
                >
                  <Input
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                    autoComplete="address-line1"
                  />
                </Field>

                <Field label={t("apartment")} htmlFor="line2" className="sm:col-span-2">
                  <Input
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    autoComplete="address-line2"
                  />
                </Field>

                <Field label={t("postalCode")} htmlFor="postalCode" required>
                  <Input
                    value={newAddress.postalCode}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, postalCode: e.target.value })
                    }
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </Field>

                <Field label={t("city")} htmlFor="city" required>
                  <Input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    autoComplete="address-level2"
                  />
                </Field>

                {isSignedIn && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Checkbox
                      checked={saveAddress}
                      onCheckedChange={(v) => setSaveAddress(v === true)}
                    />
                    {t("saveAddress")}
                  </label>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------ loyalty */}
      {loyalty && loyalty.points > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {t("usePoints")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("pointsAvailable", {
                points: loyalty.points,
                value: formatCurrency(loyalty.pointsValue, locale, config.currency),
              })}
            </p>

            <input
              type="range"
              min={0}
              max={maxRedeemablePoints}
              step={loyalty.pointsPerDiscountUnit}
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
              aria-label={t("usePoints")}
            />

            <div className="flex items-center justify-between text-sm">
              <span>{t("pointsApplied", { points: pointsToRedeem })}</span>
              <span className="font-medium text-emerald-700">
                −{formatCurrency(totals.pointsDiscount, locale, config.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------ payment */}
      <Card>
        <CardHeader>
          <CardTitle>{t("payment")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <PaymentOption
              selected={paymentMethod === "STRIPE"}
              disabled={!stripeEnabled}
              onSelect={() => setPaymentMethod("STRIPE")}
              icon={CreditCard}
              label={t("payByCard")}
              hint={stripeEnabled ? undefined : "Not configured"}
            />
            <PaymentOption
              selected={paymentMethod === "CASH"}
              onSelect={() => setPaymentMethod("CASH")}
              icon={Banknote}
              label={orderType === "DELIVERY" ? t("payOnDelivery") : t("payOnCollection")}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("addTip")}</p>
            <div className="flex gap-2">
              {TIP_PRESETS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTipRate(rate)}
                  aria-pressed={tipRate === rate}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    tipRate === rate
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {rate === 0 ? tCommon("none") : `${rate * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <Field label={tCommon("notes")} htmlFor="orderNotes">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Ring the top bell, leave at the door…"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- totals */}
      <Card>
        <CardHeader>
          <CardTitle>{t("orderSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <SummaryRow
            label={tCommon("subtotal")}
            value={formatCurrency(totals.subtotal, locale, config.currency)}
          />
          {orderType === "DELIVERY" && (
            <SummaryRow
              label={tCommon("delivery")}
              value={
                totals.deliveryFee === 0
                  ? tCommon("none")
                  : formatCurrency(totals.deliveryFee, locale, config.currency)
              }
            />
          )}
          {totals.discountAmount > 0 && (
            <SummaryRow
              label={tCommon("discount")}
              value={`−${formatCurrency(totals.discountAmount, locale, config.currency)}`}
            />
          )}
          {totals.tipAmount > 0 && (
            <SummaryRow
              label={tCommon("tip")}
              value={formatCurrency(totals.tipAmount, locale, config.currency)}
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
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        block
        loading={submitting}
        disabled={totals.belowMinimum}
      >
        {submitting
          ? t("placing")
          : `${t("placeOrder")} · ${formatCurrency(totals.total, locale, config.currency)}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t("terms")}</p>
    </form>
  );
}

function PaymentOption({
  selected,
  disabled,
  onSelect,
  icon: Icon,
  label,
  hint,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
        selected ? "border-primary bg-brand-50 " : "border-border hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Icon className="size-5 shrink-0 text-primary" />
      <span className="text-sm">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
