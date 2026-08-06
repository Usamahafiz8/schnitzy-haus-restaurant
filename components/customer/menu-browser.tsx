"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, UtensilsCrossed, X } from "lucide-react";

import { MenuItemCard, type MenuItemView } from "@/components/customer/menu-item-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  nameDe?: string | null;
  description?: string | null;
  descriptionDe?: string | null;
  displayOrder: number;
};

type Item = MenuItemView & { categoryId: string; isFeatured: boolean };

type Sort = "default" | "popular" | "price_asc" | "price_desc" | "name";

export function MenuBrowser({
  categories,
  items,
  locale,
  currency,
  initialCategory,
  initialQuery,
}: {
  categories: Category[];
  items: Item[];
  locale: string;
  currency: string;
  initialCategory: string | null;
  initialQuery: string;
}) {
  const t = useTranslations("menu");
  const tCommon = useTranslations("common");

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [diet, setDiet] = useState({ vegan: false, vegetarian: false, glutenFree: false });
  const [sort, setSort] = useState<Sort>("default");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    Number(diet.vegan) + Number(diet.vegetarian) + Number(diet.glutenFree);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = items.filter((item) => {
      if (category && item.categoryId !== category) return false;
      if (diet.vegan && !item.isVegan) return false;
      if (diet.vegetarian && !item.isVegetarian) return false;
      if (diet.glutenFree && !item.isGlutenFree) return false;

      if (needle) {
        const haystack = [item.name, item.nameDe, item.description, item.descriptionDe]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });

    const priceOf = (item: Item) =>
      item.discountPrice && item.discountPrice < item.price
        ? item.discountPrice
        : item.price;

    switch (sort) {
      case "price_asc":
        return [...result].sort((a, b) => priceOf(a) - priceOf(b));
      case "price_desc":
        return [...result].sort((a, b) => priceOf(b) - priceOf(a));
      case "name":
        return [...result].sort((a, b) => a.name.localeCompare(b.name));
      case "popular":
        return [...result].sort(
          (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
        );
      default:
        // Available first, so sold-out dishes don't take the top of the grid.
        return [...result].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
    }
  }, [items, query, category, diet, sort]);

  // With no explicit category or search, present the menu grouped like a
  // printed one instead of as an undifferentiated grid.
  const grouped = useMemo(() => {
    if (category || query.trim() || sort !== "default") return null;
    return categories
      .map((cat) => ({
        category: cat,
        items: filtered.filter((item) => item.categoryId === cat.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, filtered, category, query, sort]);

  const clearAll = () => {
    setQuery("");
    setCategory(null);
    setDiet({ vegan: false, vegetarian: false, glutenFree: false });
    setSort("default");
  };

  const label = (cat: Category) =>
    locale === "de" && cat.nameDe ? cat.nameDe : cat.name;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ controls */}
      <div className="sticky top-16 z-30 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
              aria-label={t("searchPlaceholder")}
            />
          </div>

          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label={t("filters")}
            className="relative shrink-0"
          >
            <SlidersHorizontal />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div className="scroll-x no-scrollbar -mx-1 flex gap-2 px-1 pb-1">
          <CategoryChip
            active={category === null}
            onClick={() => setCategory(null)}
            label={t("allCategories")}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              active={category === cat.id}
              onClick={() => setCategory(cat.id)}
              label={label(cat)}
            />
          ))}
        </div>

        {showFilters && (
          <div className="animate-in space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="mb-2 text-sm font-medium">{t("dietary")}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["vegan", t("vegan")],
                    ["vegetarian", t("vegetarian")],
                    ["glutenFree", t("glutenFree")],
                  ] as const
                ).map(([key, text]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDiet((d) => ({ ...d, [key]: !d[key] }))}
                    aria-pressed={diet[key]}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      diet[key]
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-3">
              <label className="flex-1 text-sm">
                <span className="mb-1 block font-medium">{t("sortBy")}</span>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label={t("sortBy")}
                >
                  <option value="default">{t("allCategories")}</option>
                  <option value="popular">{t("sortPopular")}</option>
                  <option value="price_asc">{t("sortPriceAsc")}</option>
                  <option value="price_desc">{t("sortPriceDesc")}</option>
                  <option value="name">{t("sortName")}</option>
                </Select>
              </label>

              <Button variant="ghost" onClick={clearAll}>
                <X aria-hidden />
                {tCommon("clear")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------- items */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={t("noResults")}
          action={
            <Button variant="outline" onClick={clearAll}>
              {t("clearFilters")}
            </Button>
          }
        />
      ) : grouped ? (
        <div className="space-y-10">
          {grouped.map(({ category: cat, items: catItems }) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 id={`cat-${cat.id}`} className="text-xl font-semibold">
                  {label(cat)}
                </h2>
                <Badge variant="neutral">{catItems.length}</Badge>
              </div>
              {(locale === "de" ? cat.descriptionDe : cat.description) && (
                <p className="mb-4 -mt-2 text-sm text-muted-foreground">
                  {locale === "de" ? cat.descriptionDe : cat.description}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    currency={currency}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {t("itemCount", { count: filtered.length })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                locale={locale}
                currency={currency}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
