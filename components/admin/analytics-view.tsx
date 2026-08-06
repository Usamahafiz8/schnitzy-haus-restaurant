"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Euro, Repeat, ShoppingBag, TrendingUp } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { HourBucket, SalesPoint, TopCustomer, TopItem } from "@/types";

// Categorical palette: distinguishable in both themes, and by luminance alone.
const SERIES_COLORS = ["#b45309", "#0e7490", "#4d7c0f", "#7c3aed"];

const RANGES = [7, 30, 90, 365];

// Recharts animates in JS, so the `prefers-reduced-motion` rule in globals.css
// can't reach it. Staff reload these screens all day — a 1.5s draw-in every time
// delays the number they came for, so the charts render at their final state.
const ANIMATE = false;

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
} as const;

export function AnalyticsView({
  days,
  locale,
  currency,
  totals,
  series,
  topItems,
  topCustomers,
  peakHours,
  byType,
}: {
  days: number;
  locale: string;
  currency: string;
  totals: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    repeatRatePct: number;
    customers: number;
  };
  series: SalesPoint[];
  topItems: TopItem[];
  topCustomers: TopCustomer[];
  peakHours: HourBucket[];
  byType: { orderType: string; orders: number; revenue: number }[];
}) {
  const t = useTranslations("admin");
  const tOrders = useTranslations("orders");
  const router = useRouter();

  const money = (value: number) => formatCurrency(value, locale, currency);

  // Trading hours only — a 24-bar chart of mostly zeros hides the real peaks.
  const activeHours = peakHours.filter((hour) => hour.orders > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <Button
            key={range}
            size="sm"
            variant={days === range ? "default" : "outline"}
            onClick={() => router.push(`/admin/analytics?days=${range}`)}
          >
            {range === 365 ? "1 year" : `${range} days`}
          </Button>
        ))}

        <div className="ml-auto flex flex-wrap gap-2">
          {(["sales", "orders", "items", "customers"] as const).map((report) => (
            <Button key={report} size="sm" variant="ghost" asChild>
              <a
                href={`/api/admin/reports/${report}?from=${series[0]?.date ?? ""}&to=${
                  series[series.length - 1]?.date ?? ""
                }`}
                download
              >
                <Download aria-hidden />
                {report}
              </a>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={money(totals.revenue)} icon={Euro} accent />
        <StatCard label={t("todayOrders")} value={totals.orders} icon={ShoppingBag} />
        <StatCard
          label={t("averageOrderValue")}
          value={money(totals.averageOrderValue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Repeat rate"
          value={`${totals.repeatRatePct}%`}
          hint={`${totals.customers} customers`}
          icon={Repeat}
        />
      </div>

      {/* ------------------------------------------------------------- revenue */}
      <Card>
        <CardHeader>
          <CardTitle>{t("salesOverTime")}</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <Empty label={t("noData")} />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => value.slice(5)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value: number, name) =>
                      name === "revenue" ? money(value) : value
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={SERIES_COLORS[0]}
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                    isAnimationActive={ANIMATE}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------------------------------------------------- peak hours */}
        <Card>
          <CardHeader>
            <CardTitle>{t("peakHours")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeHours.length === 0 ? (
              <Empty label={t("noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeHours}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(hour: number) => `${hour}:00`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      labelFormatter={(hour) => `${hour}:00`}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar
                      dataKey="orders"
                      fill={SERIES_COLORS[1]}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={ANIMATE}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- order types */}
        <Card>
          <CardHeader>
            <CardTitle>Order types</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <Empty label={t("noData")} />
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byType}
                        dataKey="orders"
                        nameKey="orderType"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        isAnimationActive={ANIMATE}
                      >
                        {byType.map((entry, index) => (
                          <Cell
                            key={entry.orderType}
                            fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="flex-1 space-y-2 text-sm">
                  {byType.map((entry, index) => (
                    <li key={entry.orderType} className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-sm"
                        style={{
                          background: SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                        aria-hidden
                      />
                      <span className="flex-1">
                        {tOrders(`type.${entry.orderType as "PICKUP"}`)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {entry.orders}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- best sellers */}
        <Card>
          <CardHeader>
            <CardTitle>{t("popularItems")}</CardTitle>
          </CardHeader>
          <CardContent className="scroll-x p-0">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Item</th>
                  <th className="px-5 py-2 text-right font-medium">Sold</th>
                  <th className="px-5 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item) => (
                  <tr key={item.name} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5">{item.name}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {money(item.revenue)}
                    </td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                      {t("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------- top customers */}
        <Card>
          <CardHeader>
            <CardTitle>{t("topCustomers")}</CardTitle>
          </CardHeader>
          <CardContent className="scroll-x p-0">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 text-right font-medium">Orders</th>
                  <th className="px-5 py-2 text-right font-medium">Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer) => (
                  <tr key={customer.customerId} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{customer.orders}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {money(customer.spent)}
                    </td>
                  </tr>
                ))}
                {topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                      {t("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className={cn("py-16 text-center text-sm text-muted-foreground")}>{label}</p>
  );
}
