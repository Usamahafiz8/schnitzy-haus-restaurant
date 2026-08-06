import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Flame, Leaf, WheatOff } from "lucide-react";

import { AddToCartPanel } from "@/components/customer/add-to-cart-panel";
import { MenuItemCard } from "@/components/customer/menu-item-card";
import { DishImage } from "@/components/shared/dish-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ itemId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { itemId } = await params;
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { name: true, description: true, image: true },
  });

  if (!item) return { title: "Not found" };

  return {
    title: item.name,
    description: item.description ?? undefined,
    openGraph: {
      title: item.name,
      description: item.description ?? undefined,
      images: item.image ? [item.image] : undefined,
    },
  };
}

export default async function MenuItemPage({ params }: Props) {
  const { itemId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("menu");
  const restaurant = await getRestaurant();

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { category: true },
  });

  if (!item || !restaurant) notFound();

  const related = await prisma.menuItem.findMany({
    where: {
      categoryId: item.categoryId,
      id: { not: item.id },
      isAvailable: true,
    },
    take: 3,
    orderBy: { displayOrder: "asc" },
  });

  const name = locale === "de" && item.nameDe ? item.nameDe : item.name;
  const description =
    locale === "de" && item.descriptionDe ? item.descriptionDe : item.description;
  const categoryName =
    locale === "de" && item.category.nameDe ? item.category.nameDe : item.category.name;

  const price = Number(item.price);
  const discountPrice = item.discountPrice === null ? null : Number(item.discountPrice);
  const hasDiscount = discountPrice !== null && discountPrice < price;
  const effectivePrice = hasDiscount ? discountPrice : price;

  const allergens = Array.isArray(item.allergens) ? (item.allergens as string[]) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/menu">
          <ArrowLeft aria-hidden />
          {t("title")}
        </Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <DishImage
          src={item.image}
          alt={name}
          priority
          sizes="(max-width: 768px) 100vw, 480px"
          className="aspect-[4/3] w-full overflow-hidden rounded-[--radius-card]"
        />

        <div className="flex flex-col">
          <Link
            href={`/menu?category=${item.categoryId}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {categoryName}
          </Link>

          <h1 className="mt-1 text-3xl font-bold">{name}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">
              {formatCurrency(effectivePrice, locale, restaurant.currency)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(price, locale, restaurant.currency)}
                </span>
                <Badge variant="danger">
                  −{Math.round(((price - effectivePrice) / price) * 100)}%
                </Badge>
              </>
            )}
          </div>

          {description && (
            <p className="mt-4 leading-relaxed text-muted-foreground">{description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {item.isVegan ? (
              <Badge variant="success">
                <Leaf aria-hidden />
                {t("vegan")}
              </Badge>
            ) : item.isVegetarian ? (
              <Badge variant="success">
                <Leaf aria-hidden />
                {t("vegetarian")}
              </Badge>
            ) : null}
            {item.isGlutenFree && (
              <Badge variant="info">
                <WheatOff aria-hidden />
                {t("glutenFree")}
              </Badge>
            )}
            {item.isSpicy && (
              <Badge variant="warning">
                <Flame aria-hidden />
                {t("spicy")}
              </Badge>
            )}
            <Badge variant="neutral">
              <Clock aria-hidden />
              {t("prepTime", { minutes: item.preparationTime })}
            </Badge>
            {item.calories !== null && (
              <Badge variant="neutral">{t("calories", { count: item.calories })}</Badge>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">{t("allergens")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {allergens.length > 0 ? allergens.join(" · ") : t("noAllergens")}
            </p>
          </div>

          <div className="mt-6">
            <AddToCartPanel
              item={{
                id: item.id,
                name: item.name,
                nameDe: item.nameDe,
                price: effectivePrice,
                image: item.image,
                preparationTime: item.preparationTime,
                isAvailable: item.isAvailable,
              }}
              locale={locale}
              currency={restaurant.currency}
            />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">{categoryName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((relatedItem) => (
              <MenuItemCard
                key={relatedItem.id}
                item={serialize(relatedItem)}
                locale={locale}
                currency={restaurant.currency}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
