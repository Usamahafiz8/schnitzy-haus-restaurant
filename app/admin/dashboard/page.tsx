import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  Clock,
  Euro,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { NewOrderListener } from "@/components/admin/new-order-listener";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { StarRating } from "@/components/shared/star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats, topItems } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tBookings = await getTranslations("bookings");
  const restaurant = await requireRestaurant();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);

  const [stats, recentOrders, upcomingBookings, recentReviews, popular] =
    await Promise.all([
      dashboardStats(restaurant.id),
      prisma.order.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          totalAmount: true,
          customerName: true,
          createdAt: true,
        },
      }),
      prisma.tableBooking.findMany({
        where: {
          restaurantId: restaurant.id,
          startsAt: { gte: now },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      prisma.review.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      topItems(restaurant.id, weekAgo, now, 5),
    ]);

  const currency = restaurant.currency;

  return (
    <div className="space-y-6">
      <NewOrderListener />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(now, locale)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders">{t("orders")}</Link>
        </Button>
      </header>

      {/* ---------------------------------------------------------------- kpis */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("todayRevenue")}
          value={formatCurrency(stats.todayRevenue, locale, currency)}
          changePct={stats.revenueChangePct}
          hint={t("vsYesterday")}
          icon={Euro}
          accent
        />
        <StatCard
          label={t("todayOrders")}
          value={stats.todayOrders}
          changePct={stats.ordersChangePct}
          hint={t("vsYesterday")}
          icon={ShoppingBag}
        />
        <StatCard
          label={t("pendingOrders")}
          value={stats.pendingOrders}
          icon={Clock}
        />
        <StatCard
          label={t("upcomingBookings")}
          value={stats.upcomingBookings}
          icon={CalendarDays}
        />
        <StatCard
          label={t("averageOrderValue")}
          value={formatCurrency(stats.averageOrderValue, locale, currency)}
          icon={TrendingUp}
        />
        <StatCard
          label={t("averageRating")}
          value={stats.averageRating || "—"}
          hint={`${stats.reviewCount} reviews`}
          icon={Star}
        />
        <StatCard
          label={t("newCustomers")}
          value={stats.newCustomers}
          hint="last 30 days"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --------------------------------------------------- recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("recentOrders")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders">{t("orders")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="scroll-x p-0">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Order</th>
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(order.createdAt, locale)} · {order.orderType}
                      </p>
                    </td>
                    <td className="truncate px-5 py-3">{order.customerName}</td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(order.totalAmount, locale, currency)}
                    </td>
                  </tr>
                ))}

                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      {t("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------- popular items */}
        <Card>
          <CardHeader>
            <CardTitle>{t("popularItems")}</CardTitle>
          </CardHeader>
          <CardContent>
            {popular.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <ol className="space-y-3">
                {popular.map((item, index) => (
                  <li key={item.name} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      ×{item.quantity}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ upcoming bookings */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("upcomingBookings")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bookings">{t("bookings")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {upcomingBookings.map((booking) => (
                  <li key={booking.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(booking.startsAt, locale)} ·{" "}
                        {tBookings("guestCount", { count: booking.numberOfGuests })}
                      </p>
                    </div>
                    {booking.tableNumber && (
                      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {booking.tableNumber}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------ recent reviews */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("recentReviews")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/reviews">{t("reviews")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <ul className="space-y-4">
                {recentReviews.map((review) => (
                  <li key={review.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating value={review.rating} size={14} />
                      <span className="text-xs text-muted-foreground">
                        {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                      </span>
                    </div>
                    {review.title && (
                      <p className="mt-1 text-sm font-medium">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
