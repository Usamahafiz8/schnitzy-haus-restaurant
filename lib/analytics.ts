import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import type {
  DashboardStats,
  HourBucket,
  SalesPoint,
  TopCustomer,
  TopItem,
} from "@/types";

/** Orders that represent real revenue — cancelled and failed are excluded. */
const REVENUE_WHERE: Prisma.OrderWhereInput = {
  status: { not: "CANCELLED" },
  paymentStatus: { in: ["COMPLETED", "PENDING"] },
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function dashboardStats(restaurantId: string): Promise<DashboardStats> {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart.getTime() - 86400_000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86400_000);

  const [today, yesterday, pending, bookings, ratings, newCustomers, monthly] =
    await Promise.all([
      prisma.order.aggregate({
        where: { restaurantId, createdAt: { gte: todayStart }, ...REVENUE_WHERE },
        _sum: { totalAmount: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
          ...REVENUE_WHERE,
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.order.count({
        where: {
          restaurantId,
          status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
        },
      }),
      prisma.tableBooking.count({
        where: {
          restaurantId,
          startsAt: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),
      prisma.review.aggregate({
        where: { restaurantId, status: "APPROVED" },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: thirtyDaysAgo }, isDeleted: false },
      }),
      prisma.order.aggregate({
        where: { restaurantId, createdAt: { gte: thirtyDaysAgo }, ...REVENUE_WHERE },
        _avg: { totalAmount: true },
      }),
    ]);

  const todayRevenue = toNumber(today._sum.totalAmount ?? 0);
  const yesterdayRevenue = toNumber(yesterday._sum.totalAmount ?? 0);

  return {
    todayRevenue,
    todayOrders: today._count,
    pendingOrders: pending,
    upcomingBookings: bookings,
    // Today's average is noisy before lunch; fall back to the 30-day figure.
    averageOrderValue: toNumber(today._avg.totalAmount ?? monthly._avg.totalAmount ?? 0),
    averageRating: Math.round((ratings._avg.rating ?? 0) * 10) / 10,
    reviewCount: ratings._count,
    newCustomers,
    revenueChangePct: pctChange(todayRevenue, yesterdayRevenue),
    ordersChangePct: pctChange(today._count, yesterday._count),
  };
}

export async function salesSeries(
  restaurantId: string,
  from: Date,
  to: Date,
  granularity: "day" | "week" | "month" = "day",
): Promise<SalesPoint[]> {
  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: from, lte: to }, ...REVENUE_WHERE },
    select: { createdAt: true, totalAmount: true },
    orderBy: { createdAt: "asc" },
  });

  const bucketKey = (date: Date) => {
    if (granularity === "month") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    if (granularity === "week") {
      // Bucket by the Monday that starts the week.
      const monday = new Date(date);
      const offset = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - offset);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };

  const buckets = new Map<string, SalesPoint>();

  // Pre-seed every bucket so gaps render as zero instead of collapsing the axis.
  if (granularity === "day") {
    for (let d = startOfDay(from); d <= to; d = new Date(d.getTime() + 86400_000)) {
      buckets.set(d.toISOString().slice(0, 10), {
        date: d.toISOString().slice(0, 10),
        revenue: 0,
        orders: 0,
      });
    }
  }

  for (const order of orders) {
    const key = bucketKey(order.createdAt);
    const bucket = buckets.get(key) ?? { date: key, revenue: 0, orders: 0 };
    bucket.revenue = Math.round((bucket.revenue + toNumber(order.totalAmount)) * 100) / 100;
    bucket.orders += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function topItems(
  restaurantId: string,
  from: Date,
  to: Date,
  limit = 10,
): Promise<TopItem[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ["menuItemId", "name"],
    where: {
      order: { restaurantId, createdAt: { gte: from, lte: to }, ...REVENUE_WHERE },
    },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.name,
    quantity: row._sum.quantity ?? 0,
    revenue: toNumber(row._sum.lineTotal ?? 0),
  }));
}

export async function topCustomers(
  restaurantId: string,
  from: Date,
  to: Date,
  limit = 10,
): Promise<TopCustomer[]> {
  const grouped = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      restaurantId,
      customerId: { not: null },
      createdAt: { gte: from, lte: to },
      ...REVENUE_WHERE,
    },
    _sum: { totalAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: limit,
  });

  const ids = grouped.map((g) => g.customerId).filter((id): id is string => id !== null);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .filter((g) => g.customerId !== null)
    .map((g) => {
      const user = byId.get(g.customerId!);
      return {
        customerId: g.customerId!,
        name: user ? `${user.firstName} ${user.lastName}`.trim() : "Deleted customer",
        email: user?.email ?? "",
        orders: g._count,
        spent: toNumber(g._sum.totalAmount ?? 0),
      };
    });
}

export async function peakHours(
  restaurantId: string,
  from: Date,
  to: Date,
): Promise<HourBucket[]> {
  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: from, lte: to }, ...REVENUE_WHERE },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: 0,
    revenue: 0,
  }));

  for (const order of orders) {
    const bucket = buckets[order.createdAt.getHours()];
    bucket.orders += 1;
    bucket.revenue = Math.round((bucket.revenue + toNumber(order.totalAmount)) * 100) / 100;
  }

  return buckets;
}

/** Share of customers who have ordered more than once in the window. */
export async function repeatRate(restaurantId: string, from: Date, to: Date) {
  const grouped = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      restaurantId,
      customerId: { not: null },
      createdAt: { gte: from, lte: to },
      ...REVENUE_WHERE,
    },
    _count: true,
  });

  const total = grouped.length;
  const repeat = grouped.filter((g) => g._count > 1).length;

  return {
    customers: total,
    repeatCustomers: repeat,
    repeatRatePct: total === 0 ? 0 : Math.round((repeat / total) * 100),
  };
}

export async function orderTypeBreakdown(
  restaurantId: string,
  from: Date,
  to: Date,
) {
  const grouped = await prisma.order.groupBy({
    by: ["orderType"],
    where: { restaurantId, createdAt: { gte: from, lte: to }, ...REVENUE_WHERE },
    _count: true,
    _sum: { totalAmount: true },
  });

  return grouped.map((row) => ({
    orderType: row.orderType,
    orders: row._count,
    revenue: toNumber(row._sum.totalAmount ?? 0),
  }));
}

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return headers ? headers.join(",") : "";
  const columns = headers ?? Object.keys(rows[0]);
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => csvEscape(row[c])).join(",")),
  ].join("\n");
}
