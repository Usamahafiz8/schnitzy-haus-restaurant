import { handler, ok, requireStaff } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export const GET = handler(async () => {
  await requireStaff();
  const restaurantId = await getRestaurantId();

  const coupons = await prisma.coupon.findMany({
    where: { restaurantId },
    orderBy: [{ isActive: "desc" }, { validTo: "desc" }],
    include: {
      _count: { select: { redemptions: true } },
      redemptions: {
        select: { amount: true },
      },
    },
  });

  return ok(
    coupons.map(({ redemptions, ...coupon }) => ({
      ...coupon,
      totalDiscounted: redemptions.reduce((sum, r) => sum + Number(r.amount), 0),
    })),
  );
});
