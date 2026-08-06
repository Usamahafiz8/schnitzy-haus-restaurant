"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Checkbox, EmptyState, Switch } from "@/components/ui/misc";
import { apiErrorMessage, apiFieldErrors, deleteJson, postJson, putJson } from "@/lib/api-client";
import { formatCurrency, formatDate, toDateKey } from "@/lib/utils";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  totalDiscounted: number;
  _count: { redemptions: number };
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  return Array.from(random, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function CouponsManager({
  coupons,
  locale,
  currency,
}: {
  coupons: Coupon[];
  locale: string;
  currency: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [dialog, setDialog] = useState<{ open: boolean; coupon: Coupon | null }>({
    open: false,
    coupon: null,
  });

  const toggleActive = async (coupon: Coupon) => {
    try {
      await putJson(`/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const remove = async (coupon: Coupon) => {
    try {
      const result = await deleteJson<{ deactivated?: boolean; reason?: string }>(
        `/coupons/${coupon.id}`,
      );
      toast.success(result?.reason ?? tCommon("delete"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setDialog({ open: true, coupon: null })}>
        <Plus aria-hidden />
        {t("addCoupon")}
      </Button>

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title={t("noData")} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => {
            const expired = new Date(coupon.validTo) < new Date();
            const exhausted =
              coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;

            return (
              <li key={coupon.id}>
                <Card className={!coupon.isActive || expired ? "opacity-60" : ""}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-lg font-bold">{coupon.code}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {coupon.description ?? "—"}
                        </p>
                      </div>
                      <Switch
                        checked={coupon.isActive}
                        onCheckedChange={() => toggleActive(coupon)}
                        aria-label={`Toggle ${coupon.code}`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="default">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}%`
                          : formatCurrency(coupon.discountValue, locale, currency)}
                      </Badge>
                      {coupon.minOrderAmount && (
                        <Badge variant="neutral">
                          min {formatCurrency(coupon.minOrderAmount, locale, currency)}
                        </Badge>
                      )}
                      {expired && <Badge variant="danger">Expired</Badge>}
                      {exhausted && <Badge variant="warning">Used up</Badge>}
                    </div>

                    <dl className="space-y-1 border-t border-border pt-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("usage")}</dt>
                        <dd className="tabular-nums">
                          {coupon.usageCount}
                          {coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ""}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Discounted</dt>
                        <dd className="tabular-nums">
                          {formatCurrency(coupon.totalDiscounted, locale, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Valid until</dt>
                        <dd>{formatDate(coupon.validTo, locale)}</dd>
                      </div>
                    </dl>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDialog({ open: true, coupon })}
                      >
                        {tCommon("edit")}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => remove(coupon)}
                        aria-label={`${tCommon("delete")} ${coupon.code}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <CouponDialog
        open={dialog.open}
        coupon={dialog.coupon}
        onOpenChange={(open) => setDialog({ open, coupon: open ? dialog.coupon : null })}
        onSaved={() => {
          setDialog({ open: false, coupon: null });
          router.refresh();
        }}
      />
    </div>
  );
}

const EMPTY = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
  discountValue: "10",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  validFrom: toDateKey(new Date()),
  validTo: toDateKey(new Date(Date.now() + 30 * 86400_000)),
  isActive: true,
};

function CouponDialog({
  open,
  coupon,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  coupon: Coupon | null;
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
      coupon
        ? {
            code: coupon.code,
            description: coupon.description ?? "",
            discountType: coupon.discountType,
            discountValue: String(coupon.discountValue),
            minOrderAmount: coupon.minOrderAmount === null ? "" : String(coupon.minOrderAmount),
            maxDiscount: coupon.maxDiscount === null ? "" : String(coupon.maxDiscount),
            usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
            perUserLimit: coupon.perUserLimit === null ? "" : String(coupon.perUserLimit),
            validFrom: coupon.validFrom.slice(0, 10),
            validTo: coupon.validTo.slice(0, 10),
            isActive: coupon.isActive,
          }
        : { ...EMPTY },
    );
    setErrors({});
  }, [open, coupon]);

  const save = async () => {
    setSaving(true);
    setErrors({});

    const payload = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
      validFrom: new Date(`${form.validFrom}T00:00:00`).toISOString(),
      validTo: new Date(`${form.validTo}T23:59:59`).toISOString(),
      isActive: form.isActive,
    };

    try {
      if (coupon) {
        await putJson(`/coupons/${coupon.id}`, payload);
      } else {
        await postJson("/coupons", payload);
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{coupon ? tCommon("edit") : t("addCoupon")}</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="Code" htmlFor="code" required error={errors.code}>
            <div className="flex gap-2">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="font-mono"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setForm({ ...form, code: generateCode() })}
                aria-label={t("generateCode")}
              >
                <RefreshCw />
              </Button>
            </div>
          </Field>

          <Field label={tCommon("notes")} htmlFor="description">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="10% off your first order"
            />
          </Field>

          <Field label="Type" htmlFor="discountType" required>
            <Select
              value={form.discountType}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT",
                })
              }
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </Select>
          </Field>

          <Field
            label="Value"
            htmlFor="discountValue"
            required
            error={errors.discountValue}
          >
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              required
            />
          </Field>

          <Field label="Minimum order" htmlFor="minOrderAmount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            />
          </Field>

          <Field
            label="Max discount"
            htmlFor="maxDiscount"
            hint="Caps a percentage discount"
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
            />
          </Field>

          <Field label="Total uses" htmlFor="usageLimit" hint="Blank = unlimited">
            <Input
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
          </Field>

          <Field label="Uses per customer" htmlFor="perUserLimit" hint="Blank = unlimited">
            <Input
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
            />
          </Field>

          <Field label="Valid from" htmlFor="validFrom" required>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              required
            />
          </Field>

          <Field label="Valid to" htmlFor="validTo" required error={errors.validTo}>
            <Input
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              required
            />
          </Field>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
            />
            Active
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
