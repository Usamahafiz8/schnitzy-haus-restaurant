"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { DishImage } from "@/components/shared/dish-image";
import { useCart } from "@/lib/store/cart";
import { cn, formatCurrency } from "@/lib/utils";

export type DishTileItem = {
  id: string;
  name: string;
  nameDe?: string | null;
  description?: string | null;
  descriptionDe?: string | null;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  isAvailable: boolean;
  preparationTime: number;
  /** Averaged from approved reviews; falls back to the house average. */
  rating?: number;
};

/**
 * The compact menu card used on the landing page: photo, name, rating,
 * one-line description, price, and a red add button in the corner.
 */
export function DishTile({
  item,
  locale,
  currency,
  priority,
}: {
  item: DishTileItem;
  locale: string;
  currency: string;
  priority?: boolean;
}) {
  const t = useTranslations("menu");
  const add = useCart((s) => s.add);

  const name = locale === "de" && item.nameDe ? item.nameDe : item.name;
  const description =
    locale === "de" && item.descriptionDe ? item.descriptionDe : item.description;

  const hasDiscount =
    item.discountPrice != null && item.discountPrice < item.price;
  const price = hasDiscount ? item.discountPrice! : item.price;
  const rating = item.rating ?? 0;

  const handleAdd = () => {
    add({
      itemId: item.id,
      name: item.name,
      nameDe: item.nameDe,
      price,
      image: item.image,
      preparationTime: item.preparationTime,
    });
    toast.success(t("added"), { description: name });
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg",
        !item.isAvailable && "opacity-60",
      )}
    >
      <Link href={`/menu/${item.id}`} className="block">
        <DishImage
          src={item.image}
          alt={name}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          className="aspect-[5/4] w-full"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base leading-tight tracking-wide">
          <Link href={`/menu/${item.id}`} className="hover:text-primary">
            {name}
          </Link>
        </h3>

        {rating > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "size-3",
                    star <= Math.round(rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-border text-border",
                  )}
                />
              ))}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({rating.toFixed(1)})
            </span>
          </div>
        )}

        {description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-lg text-foreground">
              {formatCurrency(price, locale, currency)}
            </p>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(item.price, locale, currency)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!item.isAvailable}
            aria-label={`${t("addToCart")}: ${name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
