"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { api, apiErrorMessage, apiFieldErrors, postJson, putJson } from "@/lib/api-client";

export type MenuItemFormValue = {
  categoryId: string;
  name: string;
  nameDe: string | null;
  description: string | null;
  descriptionDe: string | null;
  price: number;
  discountPrice: number | null;
  image: string | null;
  preparationTime: number;
  displayOrder: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  calories: number | null;
  allergens: unknown;
};

const COMMON_ALLERGENS = [
  "gluten",
  "milk",
  "eggs",
  "nuts",
  "peanuts",
  "soy",
  "fish",
  "shellfish",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
];

const EMPTY = {
  categoryId: "",
  name: "",
  nameDe: "",
  description: "",
  descriptionDe: "",
  price: "",
  discountPrice: "",
  image: "",
  preparationTime: "15",
  displayOrder: "0",
  isAvailable: true,
  isFeatured: false,
  isVegan: false,
  isVegetarian: false,
  isGlutenFree: false,
  isSpicy: false,
  calories: "",
};

export function MenuItemDialog({
  open,
  item,
  categories,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  item: (MenuItemFormValue & { id: string }) | null;
  categories: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin");
  const tMenu = useTranslations("menu");
  const tCommon = useTranslations("common");

  const [form, setForm] = useState({ ...EMPTY });
  const [allergens, setAllergens] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reload the form whenever the dialog opens on a different item.
  useEffect(() => {
    if (!open) return;

    if (item) {
      setForm({
        categoryId: item.categoryId,
        name: item.name,
        nameDe: item.nameDe ?? "",
        description: item.description ?? "",
        descriptionDe: item.descriptionDe ?? "",
        price: String(item.price),
        discountPrice: item.discountPrice === null ? "" : String(item.discountPrice),
        image: item.image ?? "",
        preparationTime: String(item.preparationTime),
        displayOrder: String(item.displayOrder),
        isAvailable: item.isAvailable,
        isFeatured: item.isFeatured,
        isVegan: item.isVegan,
        isVegetarian: item.isVegetarian,
        isGlutenFree: item.isGlutenFree,
        isSpicy: item.isSpicy,
        calories: item.calories === null ? "" : String(item.calories),
      });
      setAllergens(Array.isArray(item.allergens) ? (item.allergens as string[]) : []);
    } else {
      setForm({ ...EMPTY, categoryId: categories[0]?.id ?? "" });
      setAllergens([]);
    }

    setErrors({});
  }, [open, item, categories]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "menu");
      const response = await api.post<{ data: { url: string } }>("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image: response.data.data.url }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});

    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      nameDe: form.nameDe || undefined,
      description: form.description || undefined,
      descriptionDe: form.descriptionDe || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      image: form.image || undefined,
      preparationTime: Number(form.preparationTime),
      displayOrder: Number(form.displayOrder),
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      isVegan: form.isVegan,
      isVegetarian: form.isVegetarian || form.isVegan,
      isGlutenFree: form.isGlutenFree,
      isSpicy: form.isSpicy,
      calories: form.calories ? Number(form.calories) : null,
      allergens,
    };

    try {
      if (item) {
        await putJson(`/menu/items/${item.id}`, payload);
      } else {
        await postJson("/menu/items", payload);
      }
      toast.success(tCommon("save"));
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergen = (allergen: string) => {
    setAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? t("editItem") : t("addItem")}</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label={t("categories")} htmlFor="categoryId" required error={errors.categoryId}>
            <Select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Display order" htmlFor="displayOrder">
            <Input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            />
          </Field>

          <Field label={`${tCommon("name")} (EN)`} htmlFor="name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>

          <Field label={`${tCommon("name")} (DE)`} htmlFor="nameDe">
            <Input
              value={form.nameDe}
              onChange={(e) => setForm({ ...form, nameDe: e.target.value })}
            />
          </Field>

          <Field label="Description (EN)" htmlFor="description" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <Field label="Description (DE)" htmlFor="descriptionDe" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.descriptionDe}
              onChange={(e) => setForm({ ...form, descriptionDe: e.target.value })}
            />
          </Field>

          <Field label={tCommon("price")} htmlFor="price" required error={errors.price}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </Field>

          <Field
            label="Discount price"
            htmlFor="discountPrice"
            error={errors.discountPrice}
            hint="Leave blank for no discount"
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
            />
          </Field>

          <Field label="Prep time (min)" htmlFor="preparationTime">
            <Input
              type="number"
              min={1}
              max={240}
              value={form.preparationTime}
              onChange={(e) => setForm({ ...form, preparationTime: e.target.value })}
            />
          </Field>

          <Field label="Calories" htmlFor="calories">
            <Input
              type="number"
              min={0}
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
          </Field>

          {/* ------------------------------------------------------------- image */}
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Image</p>
            <div className="flex items-center gap-3">
              {form.image ? (
                <div className="relative size-20 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image: "" })}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5"
                    aria-label="Remove image"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted">
                  <ImagePlus className="size-5" aria-hidden />
                  <span className="sr-only">Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                </label>
              )}

              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="…or paste an image URL"
              />
            </div>
          </div>

          {/* ------------------------------------------------------------- flags */}
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Attributes</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["isAvailable", t("available")],
                  ["isFeatured", "Featured"],
                  ["isVegan", tMenu("vegan")],
                  ["isVegetarian", tMenu("vegetarian")],
                  ["isGlutenFree", tMenu("glutenFree")],
                  ["isSpicy", tMenu("spicy")],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form[key]}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, [key]: checked === true })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* --------------------------------------------------------- allergens */}
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">{tMenu("allergens")}</legend>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  aria-pressed={allergens.includes(allergen)}
                  className={
                    allergens.includes(allergen)
                      ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                  }
                >
                  {allergen}
                </button>
              ))}
            </div>
          </fieldset>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={saving || uploading}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
