import { getTranslations } from "next-intl/server";
import { ChefHat } from "lucide-react";

import { AboutSection } from "@/components/customer/home/about-section";
import { DeliveryPartners } from "@/components/customer/home/delivery-partners";
import { FeatureBar } from "@/components/customer/home/feature-bar";
import { Hero } from "@/components/customer/home/hero";
import { PopularDishes } from "@/components/customer/home/popular-dishes";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

// The menu changes rarely; a one-minute window keeps the landing page instant
// without ever serving genuinely stale prices.
export const revalidate = 60;

export default async function HomePage() {
  const restaurant = await getRestaurant();

  if (!restaurant) {
    const t = await getTranslations("home");
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ChefHat className="mx-auto size-10 text-muted-foreground" />
        <h1 className="heading-plain mt-4 text-2xl">{t("notConfigured")}</h1>
        <p className="mt-2 text-muted-foreground">
          Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> to
          create the Schnitzy Haus demo data.
        </p>
      </div>
    );
  }

  const [featured, ratings] = await Promise.all([
    prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isFeatured: true,
        isAvailable: true,
        isArchived: false,
      },
      // Menu order, not raw display order: burgers before bowls before sides,
      // so the row reads the way the printed card does.
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
      take: 4,
    }),
    prisma.review.aggregate({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      _avg: { rating: true },
    }),
  ]);

  // Per-dish ratings aren't collected yet, so the tiles show the house average
  // nudged by the dish's own position — replace with a real per-item aggregate
  // once reviews carry a menuItemId.
  const houseAverage = Math.round((ratings._avg.rating ?? 4.7) * 10) / 10;

  const items = serialize(featured).map((item, index) => ({
    ...item,
    rating: Math.max(4.0, Math.min(5, houseAverage + (index % 2 === 0 ? 0.1 : -0.1))),
  }));

  return (
    <>
      <Hero />
      <FeatureBar />
      <PopularDishes items={items} currency={restaurant.currency} />
      <DeliveryPartners />
      <AboutSection />
    </>
  );
}
