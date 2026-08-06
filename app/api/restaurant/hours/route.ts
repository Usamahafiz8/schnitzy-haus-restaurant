import { handler, ok } from "@/lib/api";
import { requireRestaurant } from "@/lib/restaurant";
import { isOpenAt, WEEKDAYS, type OpeningHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const restaurant = await requireRestaurant();
  const hours = (restaurant.openingHours ?? {}) as OpeningHours;
  const now = new Date();

  return ok({
    openingHours: hours,
    isOpenNow: isOpenAt(hours, now),
    today: WEEKDAYS[now.getDay()],
    timezone: process.env.RESTAURANT_TIMEZONE ?? "Europe/Berlin",
  });
});
