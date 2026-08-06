import { handler, ok, requireUser } from "@/lib/api";
import { loyaltySummary } from "@/lib/loyalty";
import { getRestaurantId } from "@/lib/restaurant";

/** Points balance, tier, benefits and progress to the next tier. */
export const GET = handler(async () => {
  const user = await requireUser();
  const restaurantId = await getRestaurantId();

  return ok(await loyaltySummary(restaurantId, user.id));
});
