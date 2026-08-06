"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Clock, Flame, Leaf, Plus, WheatOff } from "lucide-react";
import { toast } from "sonner";

import { DishImage } from "@/components/shared/dish-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import { cn, formatCurrency } from "@/lib/utils";

export type MenuItemView = {
  id: string;
  name: string;
  nameDe?: string | null;
  description?: string | null;
  descriptionDe?: string | null;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  preparationTime: number;
  isAvailable: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
};

export function MenuItemCard({
  item,
  locale,
  currency,
  priority,
}: {
  item: MenuItemView;
  locale: string;
  currency: string;
  priority?: boolean;
}) {
  const t = useTranslations("menu");
  const [justAdded, setJustAdded] = useState(false);
  const add = useCart((s) => s.add);

  const name = locale === "de" && item.nameDe ? item.nameDe : item.name;
  const description =
    locale === "de" && item.descriptionDe ? item.descriptionDe : item.description;

  const hasDiscount =
    item.discountPrice !== null &&
    item.discountPrice !== undefined &&
    item.discountPrice < item.price;
  const effectivePrice = hasDiscount ? item.discountPrice! : item.price;

  const handleAdd = () => {
    add({
      itemId: item.id,
      name: item.name,
      nameDe: item.nameDe,
      price: effectivePrice,
      image: item.image,
      preparationTime: item.preparationTime,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    toast.success(t("added"), { description: name });
  };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-[--radius-card] border border-border bg-card transition-shadow hover:shadow-md",
        !item.isAvailable && "opacity-60",
      )}
    >
      <Link href={`/menu/${item.id}`} className="relative block">
        <DishImage
          src={item.image}
          alt={name}
          className="aspect-[4/3] w-full"
          priority={priority}
        />

        {hasDiscount && (
          <Badge variant="danger" className="absolute left-3 top-3">
            −{Math.round(((item.price - effectivePrice) / item.price) * 100)}%
          </Badge>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="neutral">{t("unavailable")}</Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-tight">
            <Link href={`/menu/${item.id}`} className="hover:underline">
              {name}
            </Link>
          </h3>
          <div className="shrink-0 text-right">
            <p className="font-semibold">{formatCurrency(effectivePrice, locale, currency)}</p>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(item.price, locale, currency)}
              </p>
            )}
          </div>
        </div>

        {description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {item.preparationTime} min
          </span>

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!item.isAvailable}
            aria-label={`${t("addToCart")}: ${name}`}
          >
            <Plus aria-hidden />
            {justAdded ? t("added") : t("addToCart")}
          </Button>
        </div>
      </div>
    </article>
  );
}
