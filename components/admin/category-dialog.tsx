"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { apiErrorMessage, apiFieldErrors, postJson, putJson } from "@/lib/api-client";

type Category = {
  id: string;
  name: string;
  nameDe: string | null;
  description: string | null;
  descriptionDe: string | null;
  displayOrder: number;
  isActive: boolean;
};

const EMPTY = {
  name: "",
  nameDe: "",
  description: "",
  descriptionDe: "",
  displayOrder: "0",
  isActive: true,
};

export function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      category
        ? {
            name: category.name,
            nameDe: category.nameDe ?? "",
            description: category.description ?? "",
            descriptionDe: category.descriptionDe ?? "",
            displayOrder: String(category.displayOrder),
            isActive: category.isActive,
          }
        : { ...EMPTY },
    );
    setErrors({});
  }, [open, category]);

  const save = async () => {
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      nameDe: form.nameDe || undefined,
      description: form.description || undefined,
      descriptionDe: form.descriptionDe || undefined,
      displayOrder: Number(form.displayOrder),
      isActive: form.isActive,
    };

    try {
      if (category) {
        await putJson(`/menu/categories/${category.id}`, payload);
      } else {
        await postJson("/menu/categories", payload);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? tCommon("edit") : t("addCategory")}</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label={`${tCommon("name")} (EN)`} htmlFor="catName" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>

          <Field label={`${tCommon("name")} (DE)`} htmlFor="catNameDe">
            <Input
              value={form.nameDe}
              onChange={(e) => setForm({ ...form, nameDe: e.target.value })}
            />
          </Field>

          <Field label="Description (EN)" htmlFor="catDesc" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <Field label="Description (DE)" htmlFor="catDescDe" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.descriptionDe}
              onChange={(e) => setForm({ ...form, descriptionDe: e.target.value })}
            />
          </Field>

          <Field label="Display order" htmlFor="catOrder">
            <Input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            />
          </Field>

          <label className="flex items-end gap-2 pb-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
            />
            Visible on the menu
          </label>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
