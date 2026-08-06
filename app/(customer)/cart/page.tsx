import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CartView } from "@/components/customer/cart-view";
import { getRestaurant } from "@/lib/restaurant";
import { toNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title") };
}

export default async function CartPage() {
  const locale = await getLocale();
  const t = await getTranslations("cart");
  const restaurant = await getRestaurant();

  if (!restaurant) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>

      <CartView
        locale={locale}
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
      />
    </div>
  );
}
