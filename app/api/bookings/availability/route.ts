import { handler, ok, parseQuery } from "@/lib/api";
import { availabilityForDate, slotsForDate } from "@/lib/bookings";
import { requireRestaurant } from "@/lib/restaurant";
import { availabilityQuerySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const query = parseQuery(req, availabilityQuerySchema);
  const restaurant = await requireRestaurant();

  const allSlots = slotsForDate(restaurant, query.date);
  const slots = await availabilityForDate(restaurant, query.date, query.guests);

  return ok({
    date: query.date,
    guests: query.guests,
    closed: allSlots.length === 0,
    maxGuests: restaurant.bookingMaxGuests,
    durationMinutes: restaurant.bookingDurationMins,
    slots,
  });
});
