import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { CheckoutForm } from "@/components/customer/checkout-form";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loyaltySummary } from "@/lib/loyalty";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { toNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const t = await getTranslations("checkout");
  const restaurant = await getRestaurant();
  const user = await currentUser();

  if (!restaurant) redirect("/");

  // Guests may check out; the middleware only guards it when signed out of a
  // session that had one, so we simply render with empty defaults.
  const [profile, addresses, loyalty] = user
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: { firstName: true, lastName: true, email: true, phone: true },
        }),
        prisma.address.findMany({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        }),
        loyaltySummary(restaurant.id, user.id),
      ])
    : [null, [], null];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>

      <CheckoutForm
        locale={locale}
        isSignedIn={Boolean(user)}
        defaults={{
          customerName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "",
          customerEmail: profile?.email ?? "",
          customerPhone: profile?.phone ?? "",
        }}
        addresses={serialize(addresses)}
        loyalty={
          loyalty
            ? {
                points: loyalty.points,
                pointsValue: loyalty.pointsValue,
                pointsPerDiscountUnit: loyalty.pointsPerDiscountUnit,
              }
            : null
        }
        config={{
          currency: restaurant.currency,
          taxRate: toNumber(restaurant.taxRate),
          deliveryFee: toNumber(restaurant.deliveryFee),
          freeDeliveryOver:
            restaurant.freeDeliveryOver === null
              ? null
              : toNumber(restaurant.freeDeliveryOver),
          minOrderAmount: toNumber(restaurant.minOrderAmount),
          deliveryEnabled: restaurant.deliveryEnabled,
          pickupEnabled: restaurant.pickupEnabled,
          dineInEnabled: restaurant.dineInEnabled,
        }}
        stripeEnabled={Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
      />
    </div>
  );
}
