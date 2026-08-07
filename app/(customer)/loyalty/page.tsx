import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Award, Gift, Sparkles, TrendingUp } from "lucide-react";

import { CouponList } from "@/components/customer/coupon-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loyaltySummary, TIER_BENEFITS } from "@/lib/loyalty";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loyalty");
  return { title: t("title"), description: t("subtitle") };
}

export default async function LoyaltyPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/login?callbackUrl=/loyalty");

  const locale = await getLocale();
  const t = await getTranslations("loyalty");
  const restaurant = await getRestaurant();
  if (!restaurant) return null;

  const [summary, history, coupons] = await Promise.all([
    loyaltySummary(restaurant.id, user.id),
    prisma.pointsTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.coupon.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
      },
      orderBy: { validTo: "asc" },
      take: 6,
    }),
  ]);

  const benefits =
    locale === "de" ? summary.benefits.perksDe : summary.benefits.perks;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* --------------------------------------------------------- balance card */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-brand-50 to-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("yourPoints")}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums">{summary.points}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("pointsWorth", {
                  value: formatCurrency(summary.pointsValue, locale, restaurant.currency),
                })}
              </p>
            </div>

            <Badge variant="default" className="shrink-0 text-sm">
              <Award aria-hidden />
              {t("tier", { tier: t(`tiers.${summary.tier}`) })}
            </Badge>
          </div>

          {summary.next ? (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  {t("nextTier", {
                    amount: formatCurrency(
                      summary.remaining,
                      locale,
                      restaurant.currency,
                    ),
                    tier: t(`tiers.${summary.next}`),
                  })}
                </span>
                <span>{summary.percent}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={summary.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm font-medium text-primary">{t("topTier")}</p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("totalSpent")}</dt>
              <dd className="font-semibold">
                {formatCurrency(summary.totalSpent, locale, restaurant.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("orderCount")}</dt>
              <dd className="font-semibold">{summary.orderCount}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- benefits */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("benefits")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {benefits.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("howToEarn")}</p>
            <p className="mt-1">
              {t("earnRate", {
                points: summary.pointsPerCurrency,
                amount: formatCurrency(1, locale, restaurant.currency),
              })}
            </p>
            <p>
              {t("redeemRate", {
                points: summary.pointsPerDiscountUnit,
                value: formatCurrency(1, locale, restaurant.currency),
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- tier ladder */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("tiers.BRONZE")} → {t("tiers.PLATINUM")}</CardTitle>
        </CardHeader>
        <CardContent className="scroll-x">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">{t("totalSpent")}</th>
                <th className="pb-2 text-right font-medium">Discount</th>
              </tr>
            </thead>
            <tbody>
              {(["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const).map((tier) => (
                <tr
                  key={tier}
                  className={tier === summary.tier ? "font-semibold text-primary" : ""}
                >
                  <td className="border-t border-border py-2">{t(`tiers.${tier}`)}</td>
                  <td className="border-t border-border py-2 tabular-nums">
                    {tier === "BRONZE"
                      ? formatCurrency(0, locale, restaurant.currency)
                      : formatCurrency(
                          summary.thresholds[tier],
                          locale,
                          restaurant.currency,
                        )}
                    +
                  </td>
                  <td className="border-t border-border py-2 text-right tabular-nums">
                    {TIER_BENEFITS[tier].discountPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------- coupons */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-4 text-primary" aria-hidden />
            {t("availableCoupons")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CouponList
            coupons={serialize(coupons).map((coupon) => ({
              id: coupon.id,
              code: coupon.code,
              description: coupon.description,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              minOrderAmount: coupon.minOrderAmount,
              validTo: coupon.validTo,
            }))}
            locale={locale}
            currency={restaurant.currency}
          />
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------- history */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" aria-hidden />
            {t("history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("noHistory")}
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate">{t(`reason.${entry.reason}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, locale)}
                      {entry.order && ` · ${entry.order.orderNumber}`}
                    </p>
                  </div>
                  <span
                    className={
                      entry.points >= 0
                        ? "shrink-0 font-medium tabular-nums text-emerald-700 "
                        : "shrink-0 font-medium tabular-nums text-muted-foreground"
                    }
                  >
                    {entry.points >= 0 ? "+" : ""}
                    {entry.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild size="lg" block className="mt-6">
        <Link href="/menu">{t("redeem")}</Link>
      </Button>
    </div>
  );
}
