"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { apiErrorMessage, postJson } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import type { LoyaltyTier } from "@/types";

type Member = {
  id: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  totalSpent: number;
  orderCount: number;
  customer: { id: string; firstName: string; lastName: string; email: string };
};

const TIER_VARIANT: Record<LoyaltyTier, "neutral" | "info" | "warning" | "default"> = {
  BRONZE: "neutral",
  SILVER: "info",
  GOLD: "warning",
  PLATINUM: "default",
};

export function LoyaltyMembers({
  members,
  tierCounts,
  thresholds,
  locale,
  currency,
}: {
  members: Member[];
  tierCounts: Record<string, number>;
  thresholds: Record<string, number>;
  locale: string;
  currency: string;
}) {
  const t = useTranslations("admin");
  const tLoyalty = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<LoyaltyTier | null>(null);
  const [adjusting, setAdjusting] = useState<Member | null>(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (tier && member.tier !== tier) return false;
      if (!needle) return true;
      return `${member.customer.firstName} ${member.customer.lastName} ${member.customer.email}`
        .toLowerCase()
        .includes(needle);
    });
  }, [members, query, tier]);

  const adjust = async () => {
    if (!adjusting) return;
    const delta = Number(points);
    if (!Number.isInteger(delta) || delta === 0) {
      toast.error("Enter a non-zero whole number");
      return;
    }

    setSaving(true);
    try {
      await postJson("/loyalty/admin", {
        customerId: adjusting.customer.id,
        points: delta,
        note: note || undefined,
      });
      toast.success(t("adjustPoints"));
      setAdjusting(null);
      setPoints("");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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
      </div>

      <div className="scroll-x no-scrollbar -mx-1 flex gap-2 px-1 pb-1">
        <TierChip
          active={tier === null}
          onClick={() => setTier(null)}
          label={tCommon("all")}
          count={members.length}
        />
        {(["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const).map((option) => (
          <TierChip
            key={option}
            active={tier === option}
            onClick={() => setTier(option)}
            label={tLoyalty(`tiers.${option}`)}
            count={tierCounts[option] ?? 0}
            hint={
              option === "BRONZE"
                ? undefined
                : formatCurrency(thresholds[option] ?? 0, locale, currency)
            }
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title={t("noData")} />
      ) : (
        <Card>
          <CardContent className="scroll-x p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{tCommon("name")}</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2 text-right font-medium">Points</th>
                  <th className="px-4 py-2 text-right font-medium">{tLoyalty("totalSpent")}</th>
                  <th className="px-4 py-2 text-right font-medium">Orders</th>
                  <th className="px-4 py-2 text-right font-medium">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {member.customer.firstName} {member.customer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.customer.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TIER_VARIANT[member.tier]}>
                        {tLoyalty(`tiers.${member.tier}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {member.points}
                      <span className="block text-xs text-muted-foreground">
                        {member.lifetimePoints} lifetime
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(member.totalSpent, locale, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {member.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdjusting(member)}
                      >
                        {t("adjustPoints")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={adjusting !== null} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adjustPoints")}</DialogTitle>
            <DialogDescription>
              {adjusting &&
                `${adjusting.customer.firstName} ${adjusting.customer.lastName} · ${adjusting.points} points`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field
              label="Adjustment"
              htmlFor="pointsDelta"
              required
              hint="Positive to add, negative to remove"
            >
              <Input
                type="number"
                step={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 250 or -100"
                autoFocus
              />
            </Field>

            <Field label={tCommon("notes")} htmlFor="pointsNote">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Goodwill for a late delivery"
                maxLength={200}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjusting(null)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={adjust} loading={saving}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TierChip({
  active,
  onClick,
  label,
  count,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  hint?: string;
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
      {hint && <span className="text-xs opacity-60">{hint}+</span>}
    </button>
  );
}
