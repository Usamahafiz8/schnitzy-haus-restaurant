import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AnalyticsView } from "@/components/admin/analytics-view";
import {
  orderTypeBreakdown,
  peakHours,
  repeatRate,
  salesSeries,
  topCustomers,
  topItems,
} from "@/lib/analytics";
import { requireRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const days = Math.min(365, Math.max(1, Number(params.days ?? 30)));
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400_000);
  from.setHours(0, 0, 0, 0);

  const [series, items, customers, hours, repeat, byType] = await Promise.all([
    salesSeries(restaurant.id, from, to, days > 90 ? "week" : "day"),
    topItems(restaurant.id, from, to, 10),
    topCustomers(restaurant.id, from, to, 10),
    peakHours(restaurant.id, from, to),
    repeatRate(restaurant.id, from, to),
    orderTypeBreakdown(restaurant.id, from, to),
  ]);

  const revenue = series.reduce((sum, point) => sum + point.revenue, 0);
  const orders = series.reduce((sum, point) => sum + point.orders, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("analytics")}</h1>

      <AnalyticsView
        days={days}
        locale={locale}
        currency={restaurant.currency}
        totals={{
          revenue: Math.round(revenue * 100) / 100,
          orders,
          averageOrderValue:
            orders === 0 ? 0 : Math.round((revenue / orders) * 100) / 100,
          repeatRatePct: repeat.repeatRatePct,
          customers: repeat.customers,
        }}
        series={series}
        topItems={items}
        topCustomers={customers}
        peakHours={hours}
        byType={byType}
      />
    </div>
  );
}
