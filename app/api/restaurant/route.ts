import { handler, logActivity, ok, parseBody, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { isOpenAt, type OpeningHours } from "@/lib/utils";
import { restaurantStatusSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const restaurant = await requireRestaurant();

  return ok({
    ...restaurant,
    isOpenNow: isOpenAt(restaurant.openingHours as OpeningHours),
  });
});

// The profile is hardcoded (lib/restaurant-config.ts) — the only thing left
// to write here is isActive, the live "stop accepting orders" switch.
export const PUT = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, restaurantStatusSchema);
  const restaurant = await requireRestaurant();

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { isActive: input.isActive },
  });

  await logActivity(admin.id, "restaurant.update", "Restaurant", restaurant.id, {
    fields: Object.keys(input),
  });

  return ok({ ...restaurant, isActive: updated.isActive });
});
