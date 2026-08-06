import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { MenuBrowser } from "@/components/customer/menu-browser";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("menu");
  return { title: t("title"), description: t("subtitle") };
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("menu");
  const restaurant = await getRestaurant();

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">
        Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> first.
      </div>
    );
  }

  // The whole menu is a few dozen rows — fetching it once and filtering on the
  // client makes search and dietary filters instant, with no request per keypress.
  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <MenuBrowser
        categories={serialize(categories)}
        items={serialize(items)}
        locale={locale}
        currency={restaurant.currency}
        initialCategory={params.category ?? null}
        initialQuery={params.q ?? ""}
      />
    </div>
  );
}
