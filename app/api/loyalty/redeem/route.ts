import { badRequest, handler, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loyaltySummary, parseThresholds, recordPoints } from "@/lib/loyalty";
import { requireRestaurant } from "@/lib/restaurant";
import { redeemPointsSchema } from "@/lib/validations";

/**
 * Standalone redemption: converts points into a personal one-use coupon.
 *
 * Redeeming *during* checkout goes through `POST /api/orders` instead, where the
 * points and the order are written in one transaction. This endpoint exists for
 * customers who want to bank a discount ahead of time.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { points } = await parseBody(req, redeemPointsSchema);
  const restaurant = await requireRestaurant();

  const summary = await loyaltySummary(restaurant.id, user.id);

  if (points > summary.points) {
    throw badRequest(`You only have ${summary.points} points available`);
  }
  if (points % restaurant.pointsPerDiscountUnit !== 0) {
    throw badRequest(
      `Redeem in multiples of ${restaurant.pointsPerDiscountUnit} points`,
    );
  }

  const value = points / restaurant.pointsPerDiscountUnit;
  const code = `PTS-${user.id.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const coupon = await prisma.$transaction(async (tx) => {
    await recordPoints(tx, {
      restaurantId: restaurant.id,
      customerId: user.id,
      points: -points,
      reason: "REDEEMED",
      note: `Redeemed for coupon ${code}`,
      thresholds: parseThresholds(restaurant.tierThresholds),
    });

    return tx.coupon.create({
      data: {
        restaurantId: restaurant.id,
        code,
        description: `${points} points redeemed`,
        discountType: "FIXED_AMOUNT",
        discountValue: value,
        usageLimit: 1,
        perUserLimit: 1,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 86400_000),
        isActive: true,
      },
    });
  });

  return ok({
    code: coupon.code,
    value,
    pointsRedeemed: points,
    validTo: coupon.validTo,
    remainingPoints: summary.points - points,
  });
});
