import { handler, ok, parseQuery, requireStaff } from "@/lib/api";
import {
  orderTypeBreakdown,
  peakHours,
  repeatRate,
  salesSeries,
  topCustomers,
  topItems,
} from "@/lib/analytics";
import { getRestaurantId } from "@/lib/restaurant";
import { analyticsQuerySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireStaff();
  const query = parseQuery(req, analyticsQuerySchema);
  const restaurantId = await getRestaurantId();

  const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
  const from = query.from
    ? new Date(`${query.from}T00:00:00`)
    : new Date(to.getTime() - 29 * 86400_000);

  const [series, items, customers, hours, repeat, byType] = await Promise.all([
    salesSeries(restaurantId, from, to, query.granularity),
    topItems(restaurantId, from, to, 10),
    topCustomers(restaurantId, from, to, 10),
    peakHours(restaurantId, from, to),
    repeatRate(restaurantId, from, to),
    orderTypeBreakdown(restaurantId, from, to),
  ]);

  const revenue = series.reduce((sum, point) => sum + point.revenue, 0);
  const orders = series.reduce((sum, point) => sum + point.orders, 0);

  return ok({
    range: { from: from.toISOString(), to: to.toISOString(), granularity: query.granularity },
    totals: {
      revenue: Math.round(revenue * 100) / 100,
      orders,
      averageOrderValue: orders === 0 ? 0 : Math.round((revenue / orders) * 100) / 100,
    },
    series,
    topItems: items,
    topCustomers: customers,
    peakHours: hours,
    repeat,
    byType,
  });
});
