import { handler, ok, requireStaff } from "@/lib/api";
import { dashboardStats, topItems } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { ORDER_LIST_SELECT } from "@/lib/orders";
import { getRestaurantId } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireStaff();
  const restaurantId = await getRestaurantId();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [stats, recentOrders, upcomingBookings, recentReviews, popular] =
    await Promise.all([
      dashboardStats(restaurantId),
      prisma.order.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: ORDER_LIST_SELECT,
      }),
      prisma.tableBooking.findMany({
        where: {
          restaurantId,
          startsAt: { gte: now },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      prisma.review.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      topItems(restaurantId, weekAgo, now, 5),
    ]);

  return ok({ stats, recentOrders, upcomingBookings, recentReviews, popular });
});
