import { handler, logActivity, ok, parseBody, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { isOpenAt, type OpeningHours } from "@/lib/utils";
import { restaurantSettingsSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const restaurant = await requireRestaurant();

  return ok({
    ...restaurant,
    isOpenNow: isOpenAt(restaurant.openingHours as OpeningHours),
  });
});

export const PUT = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, restaurantSettingsSchema);
  const restaurant = await requireRestaurant();

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      ...input,
      whatsappNumber:
        input.whatsappNumber === "" ? null : input.whatsappNumber,
      logoUrl: input.logoUrl === "" ? null : input.logoUrl,
      bannerUrl: input.bannerUrl === "" ? null : input.bannerUrl,
      freeDeliveryOver: input.freeDeliveryOver ?? undefined,
    },
  });

  await logActivity(admin.id, "restaurant.update", "Restaurant", restaurant.id, {
    fields: Object.keys(input),
  });

  return ok(updated);
});
