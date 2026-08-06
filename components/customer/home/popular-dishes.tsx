import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { DishTile, type DishTileItem } from "@/components/customer/dish-tile";
import { Button } from "@/components/ui/button";

export async function PopularDishes({
  items,
  currency,
}: {
  items: DishTileItem[];
  currency: string;
}) {
  const t = await getTranslations("home");
  const locale = await getLocale();

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("highlightsEyebrow")}</p>
          <h2 className="mt-1.5 font-display text-3xl sm:text-4xl">
            {t("highlightsTitle")}
          </h2>
        </div>

        <Button variant="outline" asChild className="shrink-0 uppercase">
          <Link href="/menu">{t("fullMenu")}</Link>
        </Button>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <DishTile
              item={item}
              locale={locale}
              currency={currency}
              priority={index < 4}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
