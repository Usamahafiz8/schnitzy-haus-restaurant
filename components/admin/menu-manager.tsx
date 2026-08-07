"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ChefHat, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryDialog } from "@/components/admin/category-dialog";
import { MenuItemDialog, type MenuItemFormValue } from "@/components/admin/menu-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox, EmptyState, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, deleteJson, patchJson, putJson } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  nameDe: string | null;
  description: string | null;
  descriptionDe: string | null;
  displayOrder: number;
  isActive: boolean;
  _count: { items: number };
};

type Item = MenuItemFormValue & { id: string };

export function MenuManager({
  categories,
  items,
  locale,
  currency,
}: {
  categories: Category[];
  items: Item[];
  locale: string;
  currency: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: Item | null }>({
    open: false,
    item: null,
  });
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter && item.categoryId !== categoryFilter) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, query, categoryFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulk = async (action: "available" | "unavailable" | "feature" | "unfeature" | "delete") => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const result = await patchJson<{ updated?: number; deleted?: number; hidden?: number }>(
        "/menu/items",
        { ids: [...selected], action },
      );
      // Deleting a dish that appears in an order hides it instead — say so.
      if (result.hidden) {
        toast.success(
          `${result.deleted ?? 0} deleted, ${result.hidden} hidden (they appear in past orders)`,
        );
      } else {
        toast.success(tCommon("save"));
      }
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailability = async (item: Item) => {
    try {
      await putJson(`/menu/items/${item.id}`, { isAvailable: !item.isAvailable });
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteJson(`/menu/categories/${id}`);
      toast.success(tCommon("delete"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">{t("items")}</TabsTrigger>
        <TabsTrigger value="categories">{t("categories")}</TabsTrigger>
      </TabsList>

      {/* ---------------------------------------------------------------- items */}
      <TabsContent value="items" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tCommon("search")}
              className="pl-9"
            />
          </div>

          <Button onClick={() => setItemDialog({ open: true, item: null })}>
            <Plus aria-hidden />
            {t("addItem")}
          </Button>
        </div>

        <div className="scroll-x no-scrollbar -mx-1 flex gap-2 px-1 pb-1">
          <FilterChip
            active={categoryFilter === null}
            onClick={() => setCategoryFilter(null)}
            label={tCommon("all")}
            count={items.length}
          />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              active={categoryFilter === category.id}
              onClick={() => setCategoryFilter(category.id)}
              label={locale === "de" && category.nameDe ? category.nameDe : category.name}
              count={category._count.items}
            />
          ))}
        </div>

        {selected.size > 0 && (
          <div className="animate-in flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-brand-50/60 p-3">
            <span className="text-sm font-medium">
              {t("selected", { count: selected.size })}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("available")}>
                {t("available")}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("unavailable")}>
                {t("unavailable")}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("feature")}>
                ★
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => bulk("delete")}
              >
                <Trash2 aria-hidden />
                {tCommon("delete")}
              </Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={ChefHat} title={t("noData")} />
        ) : (
          <Card>
            <CardContent className="scroll-x p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 px-4 py-2">
                      <Checkbox
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked === true
                              ? new Set(filtered.map((i) => i.id))
                              : new Set(),
                          )
                        }
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-2 font-medium">{tCommon("name")}</th>
                    <th className="px-4 py-2 font-medium">{tCommon("price")}</th>
                    <th className="px-4 py-2 font-medium">{t("available")}</th>
                    <th className="px-4 py-2 text-right font-medium">
                      {tCommon("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {item.isFeatured && <Badge variant="default">★</Badge>}
                          {item.isVegan && <Badge variant="success">V</Badge>}
                          {item.isGlutenFree && <Badge variant="info">GF</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {item.discountPrice ? (
                          <>
                            <span className="font-medium text-destructive">
                              {formatCurrency(item.discountPrice, locale, currency)}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground line-through">
                              {formatCurrency(item.price, locale, currency)}
                            </span>
                          </>
                        ) : (
                          formatCurrency(item.price, locale, currency)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleAvailability(item)}
                          aria-label={`${t("toggleAvailability")}: ${item.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setItemDialog({ open: true, item })}
                          aria-label={`${tCommon("edit")} ${item.name}`}
                        >
                          <Pencil />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ----------------------------------------------------------- categories */}
      <TabsContent value="categories" className="space-y-4">
        <Button onClick={() => setCategoryDialog({ open: true, category: null })}>
          <Plus aria-hidden />
          {t("addCategory")}
        </Button>

        <ul className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {category.name}
                      {category.nameDe && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          / {category.nameDe}
                        </span>
                      )}
                    </p>
                    {category.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="neutral">{category._count.items} items</Badge>
                      {!category.isActive && <Badge variant="danger">Hidden</Badge>}
                      <Badge variant="outline">#{category.displayOrder}</Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setCategoryDialog({ open: true, category })}
                      aria-label={`${tCommon("edit")} ${category.name}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => deleteCategory(category.id)}
                      disabled={category._count.items > 0}
                      aria-label={`${tCommon("delete")} ${category.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </TabsContent>

      <MenuItemDialog
        open={itemDialog.open}
        item={itemDialog.item}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onOpenChange={(open) => setItemDialog({ open, item: open ? itemDialog.item : null })}
        onSaved={() => {
          setItemDialog({ open: false, item: null });
          router.refresh();
        }}
      />

      <CategoryDialog
        open={categoryDialog.open}
        category={categoryDialog.category}
        onOpenChange={(open) =>
          setCategoryDialog({ open, category: open ? categoryDialog.category : null })
        }
        onSaved={() => {
          setCategoryDialog({ open: false, category: null });
          router.refresh();
        }}
      />
    </Tabs>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
