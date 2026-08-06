import { handler, ok, requireUser } from "@/lib/api";
import { loyaltySummary } from "@/lib/loyalty";
import { getRestaurantId } from "@/lib/restaurant";

/** Alias of `/api/loyalty` kept to match the published API surface. */
export const GET = handler(async () => {
  const user = await requireUser();
  const restaurantId = await getRestaurantId();

  const summary = await loyaltySummary(restaurantId, user.id);

  return ok({
    points: summary.points,
    lifetimePoints: summary.lifetimePoints,
    tier: summary.tier,
    pointsValue: summary.pointsValue,
    pointsPerDiscountUnit: summary.pointsPerDiscountUnit,
  });
});
