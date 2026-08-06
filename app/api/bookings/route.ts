import type { Prisma } from "@prisma/client";

import {
  badRequest,
  created,
  currentUser,
  handler,
  logActivity,
  ok,
  paginate,
  paginated,
  parseBody,
} from "@/lib/api";
import {
  assignTable,
  availabilityForDate,
  resolveBookingInstant,
} from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { captureError } from "@/lib/monitoring";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { nextBookingNumber } from "@/lib/orders";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireRestaurant } from "@/lib/restaurant";
import { parseDateKey } from "@/lib/utils";
import { createBookingSchema } from "@/lib/validations";

export const GET = handler(async (req: Request) => {
  const user = await currentUser();
  if (!user) return ok(paginated([], 0, 1, 20));

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 20));
  const upcoming = url.searchParams.get("upcoming") === "true";

  const where: Prisma.TableBookingWhereInput = {
    customerId: user.id,
    ...(upcoming ? { startsAt: { gte: new Date() }, status: { not: "CANCELLED" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tableBooking.findMany({
      where,
      orderBy: { startsAt: upcoming ? "asc" : "desc" },
      ...paginate(page, pageSize),
    }),
    prisma.tableBooking.count({ where }),
  ]);

  return ok(paginated(items, total, page, pageSize));
});

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "booking", RATE_LIMITS.booking.limit, RATE_LIMITS.booking.windowMs);

  const input = await parseBody(req, createBookingSchema);
  const user = await currentUser();
  const restaurant = await requireRestaurant();

  if (input.numberOfGuests > restaurant.bookingMaxGuests) {
    throw badRequest(
      `We take online bookings up to ${restaurant.bookingMaxGuests} guests. For a larger party, please call us.`,
    );
  }

  // Re-check availability server-side: the slot list the customer saw may be
  // minutes old, and two people can pick the same slot at the same moment.
  const slots = await availabilityForDate(restaurant, input.bookingDate, input.numberOfGuests);
  const slot = slots.find((s) => s.time === input.bookingTime);

  if (!slot) {
    throw badRequest("We're not open at that time. Please pick another slot.");
  }
  if (!slot.available) {
    throw badRequest("That slot was just taken. Please choose another time.");
  }

  const { startsAt, endsAt } = resolveBookingInstant(
    input.bookingDate,
    input.bookingTime,
    restaurant.bookingDurationMins,
  );

  const table = await assignTable(restaurant.id, input.numberOfGuests, startsAt, endsAt);
  if (!table) {
    throw badRequest("We don't have a free table that size at that time.");
  }

  const booking = await prisma.$transaction(async (tx) => {
    // Guard against a double-book of the very table we just picked.
    const clash = await tx.tableBooking.findFirst({
      where: {
        tableId: table.id,
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (clash) {
      throw badRequest("That slot was just taken. Please choose another time.");
    }

    const bookingNumber = await nextBookingNumber(tx);

    return tx.tableBooking.create({
      data: {
        restaurantId: restaurant.id,
        customerId: user?.id ?? null,
        bookingNumber,
        numberOfGuests: input.numberOfGuests,
        bookingDate: parseDateKey(input.bookingDate),
        bookingTime: input.bookingTime,
        startsAt,
        endsAt,
        tableId: table.id,
        tableNumber: table.number,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        specialRequests: input.specialRequests || null,
        occasion: input.occasion || null,
        status: "CONFIRMED",
      },
    });
  });

  try {
    await notifyBookingConfirmed({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      date: input.bookingDate,
      time: input.bookingTime,
      guests: input.numberOfGuests,
      specialRequests: booking.specialRequests,
    });
  } catch (error) {
    captureError(error, { scope: "booking-notify", bookingId: booking.id });
  }

  await logActivity(user?.id ?? null, "booking.create", "TableBooking", booking.id, {
    bookingNumber: booking.bookingNumber,
  });

  return created(booking);
});
