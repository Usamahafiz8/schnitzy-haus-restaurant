import "server-only";

import { prisma } from "@/lib/db";
import type { RestaurantConfig } from "@/lib/restaurant-config";
import type { TimeSlot } from "@/types";
import {
  WEEKDAYS,
  minutesToTime,
  parseDateKey,
  timeToMinutes,
  type OpeningHours,
} from "@/lib/utils";

/**
 * Booking times are entered and displayed in the restaurant's local wall clock.
 * We resolve them to absolute instants once, on write, using the server's zone
 * — set TZ on the deployment to match the restaurant (e.g. Europe/Berlin).
 */
export function resolveBookingInstant(
  dateKey: string,
  time: string,
  durationMinutes: number,
) {
  const minutes = timeToMinutes(time);
  if (minutes === null) throw new Error("Invalid time");

  const [year, month, day] = dateKey.split("-").map(Number);
  const startsAt = new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  return { startsAt, endsAt };
}

type BookingRestaurant = Pick<
  RestaurantConfig,
  "openingHours" | "bookingSlotMinutes" | "bookingMaxGuests" | "bookingLeadHours" | "bookingDurationMins"
> & { id: string };

/** Every slot the restaurant is open for on this date, ignoring occupancy. */
export function slotsForDate(
  restaurant: BookingRestaurant,
  dateKey: string,
): string[] {
  const hours = (restaurant.openingHours ?? {}) as OpeningHours;
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAYS[date.getUTCDay()];
  const today = hours[weekday];

  if (!today || today.closed) return [];

  const open = timeToMinutes(today.open);
  const close = timeToMinutes(today.close);
  if (open === null || close === null) return [];

  const step = restaurant.bookingSlotMinutes || 30;
  // Stop early enough that a full sitting still fits before closing.
  const lastStart = (close <= open ? close + 24 * 60 : close) - restaurant.bookingDurationMins;

  const slots: string[] = [];
  for (let m = open; m <= lastStart; m += step) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

/**
 * Availability = total seats at active tables minus seats already committed to
 * overlapping bookings. A slot needs one table that fits the party, not just
 * enough loose seats, so we check both.
 */
export async function availabilityForDate(
  restaurant: BookingRestaurant,
  dateKey: string,
  guests: number,
): Promise<TimeSlot[]> {
  const slots = slotsForDate(restaurant, dateKey);
  if (slots.length === 0) return [];

  const [tables, bookings] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id, isActive: true, status: { not: "OUT_OF_SERVICE" } },
      select: { id: true, seats: true },
      orderBy: { seats: "asc" },
    }),
    prisma.tableBooking.findMany({
      where: {
        restaurantId: restaurant.id,
        bookingDate: parseDateKey(dateKey),
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
      },
      select: { startsAt: true, endsAt: true, numberOfGuests: true, tableId: true },
    }),
  ]);

  const duration = restaurant.bookingDurationMins;
  const leadCutoff = new Date(Date.now() + restaurant.bookingLeadHours * 3600_000);
  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);

  // A party can only be seated at a table big enough to hold it.
  const fittingTables = tables.filter((t) => t.seats >= guests).length;

  return slots.map((time) => {
    const { startsAt, endsAt } = resolveBookingInstant(dateKey, time, duration);

    if (startsAt < leadCutoff || guests > restaurant.bookingMaxGuests) {
      return { time, available: false, remainingSeats: 0 };
    }

    const overlapping = bookings.filter(
      (b) => b.startsAt < endsAt && b.endsAt > startsAt,
    );
    const seatsTaken = overlapping.reduce((sum, b) => sum + b.numberOfGuests, 0);
    const tablesTaken = new Set(
      overlapping.map((b) => b.tableId).filter(Boolean),
    ).size;

    const remainingSeats = Math.max(0, totalSeats - seatsTaken);
    const available =
      remainingSeats >= guests && fittingTables > tablesTaken;

    return { time, available, remainingSeats };
  });
}

/** Picks the smallest free table that fits the party, so big tables stay open. */
export async function assignTable(
  restaurantId: string,
  guests: number,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<{ id: string; number: string } | null> {
  const tables = await prisma.restaurantTable.findMany({
    where: {
      restaurantId,
      isActive: true,
      status: { not: "OUT_OF_SERVICE" },
      seats: { gte: guests },
    },
    orderBy: [{ seats: "asc" }, { number: "asc" }],
    select: { id: true, number: true },
  });

  if (tables.length === 0) return null;

  const busy = await prisma.tableBooking.findMany({
    where: {
      restaurantId,
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      tableId: { in: tables.map((t) => t.id) },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { tableId: true },
  });

  const taken = new Set(busy.map((b) => b.tableId));
  return tables.find((t) => !taken.has(t.id)) ?? null;
}

export const BOOKING_CANCEL_CUTOFF_HOURS = 2;

export function canCancelBooking(startsAt: Date): boolean {
  return startsAt.getTime() - Date.now() > BOOKING_CANCEL_CUTOFF_HOURS * 3600_000;
}
