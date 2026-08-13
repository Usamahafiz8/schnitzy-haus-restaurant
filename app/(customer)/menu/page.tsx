import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { MenuBrowser } from "@/components/customer/menu-browser";
import { MENU_CATEGORIES, MENU_ITEMS } from "@/lib/menu-data";
import { getRestaurant } from "@/lib/restaurant";

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

  // The whole menu is a few dozen hardcoded rows — no request per keypress,
  // search and dietary filters just run against the array on the client.
  // Unavailable items still show, greyed out, so regulars can see what's sold
  // out today rather than wondering why a dish vanished.
  const categories = [...MENU_CATEGORIES].sort((a, b) => a.displayOrder - b.displayOrder);
  const items = [...MENU_ITEMS].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <MenuBrowser
        categories={categories}
        items={items}
        locale={locale}
        currency={restaurant.currency}
        initialCategory={params.category ?? null}
        initialQuery={params.q ?? ""}
      />
    </div>
  );
}
