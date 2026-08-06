"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// Created once per module: loadStripe kicks off a network fetch and must not
// re-run on every render.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export function StripePayment({
  clientSecret,
  orderId,
  orderNumber,
  amount,
  locale,
  currency,
  onSucceeded,
}: {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  locale: string;
  currency: string;
  onSucceeded: () => void;
}) {
  const t = useTranslations("checkout");

  const options = useMemo(
    () => ({
      clientSecret,
      locale: (locale === "de" ? "de" : "en") as "de" | "en",
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#b45309",
          borderRadius: "8px",
          fontFamily: "system-ui, sans-serif",
        },
      },
    }),
    [clientSecret, locale],
  );

  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Stripe isn&apos;t configured on this deployment.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-primary" aria-hidden />
          {t("cardDetails")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {orderNumber} · {formatCurrency(amount, locale, currency)}
        </p>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <PaymentInner
            orderId={orderId}
            amount={amount}
            locale={locale}
            currency={currency}
            onSucceeded={onSucceeded}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

function PaymentInner({
  orderId,
  amount,
  locale,
  currency,
  onSucceeded,
}: {
  orderId: string;
  amount: number;
  locale: string;
  currency: string;
  onSucceeded: () => void;
}) {
  const t = useTranslations("checkout");
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Only used for methods that leave the page (iDEAL, Klarna, 3DS redirects).
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation/${orderId}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? t("paymentFailed"));
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSucceeded();
      router.push(`/order-confirmation/${orderId}`);
      return;
    }

    setError(t("paymentFailed"));
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" block loading={submitting} disabled={!stripe}>
        {submitting
          ? t("placing")
          : `${t("placeOrder")} · ${formatCurrency(amount, locale, currency)}`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden />
        Card details are handled by Stripe and never touch our servers.
      </p>
    </form>
  );
}
