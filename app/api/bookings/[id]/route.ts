import {
  badRequest,
  currentUser,
  forbidden,
  handler,
  logActivity,
  notFound,
  ok,
  parseBody,
} from "@/lib/api";
import {
  assignTable,
  availabilityForDate,
  canCancelBooking,
  resolveBookingInstant,
} from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { parseDateKey, toDateKey } from "@/lib/utils";
import { updateBookingSchema } from "@/lib/validations";
import { STAFF_ROLES } from "@/types";

type Params = { params: Promise<{ id: string }> };

async function loadAuthorised(id: string) {
  const booking = await prisma.tableBooking.findUnique({ where: { id } });
  if (!booking) throw notFound("We couldn't find that booking");

  const user = await currentUser();
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const isOwner = user && booking.customerId === user.id;
  const isGuestBooking = booking.customerId === null;

  if (!isStaff && !isOwner && !isGuestBooking) {
    throw forbidden("This booking belongs to a different account");
  }

  return { booking, user, isStaff: Boolean(isStaff) };
}

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const { booking } = await loadAuthorised(id);
  return ok(booking);
});

export const PUT = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const { booking, user, isStaff } = await loadAuthorised(id);
  const input = await parseBody(req, updateBookingSchema);
  const restaurant = await requireRestaurant();

  // Only staff may set an arbitrary status or pin a specific table.
  if (!isStaff && (input.status || input.tableId !== undefined)) {
    throw forbidden("Only restaurant staff can change a booking's status or table");
  }

  if (booking.status === "CANCELLED" && input.status !== "CONFIRMED") {
    throw badRequest("This booking has been cancelled");
  }

  const movingTime =
    input.bookingDate !== undefined ||
    input.bookingTime !== undefined ||
    input.numberOfGuests !== undefined;

  let timing: { startsAt: Date; endsAt: Date } | null = null;
  let tableId = booking.tableId;
  let tableNumber = booking.tableNumber;

  if (movingTime) {
    const dateKey = input.bookingDate ?? toDateKey(booking.bookingDate);
    const time = input.bookingTime ?? booking.bookingTime;
    const guests = input.numberOfGuests ?? booking.numberOfGuests;

    if (!isStaff) {
      const slots = await availabilityForDate(restaurant, dateKey, guests);
      const slot = slots.find((s) => s.time === time);
      if (!slot?.available) {
        throw badRequest("That slot isn't available. Please pick another time.");
      }
    }

    timing = resolveBookingInstant(dateKey, time, restaurant.bookingDurationMins);

    const table = await assignTable(
      restaurant.id,
      guests,
      timing.startsAt,
      timing.endsAt,
      booking.id,
    );
    if (!table) throw badRequest("We don't have a free table that size at that time.");
    tableId = table.id;
    tableNumber = table.number;
  }

  if (input.tableId !== undefined && isStaff) {
    if (input.tableId === null) {
      tableId = null;
      tableNumber = null;
    } else {
      const table = await prisma.restaurantTable.findFirst({
        where: { id: input.tableId, restaurantId: restaurant.id },
        select: { id: true, number: true },
      });
      if (!table) throw badRequest("That table doesn't exist");
      tableId = table.id;
      tableNumber = table.number;
    }
  }

  const updated = await prisma.tableBooking.update({
    where: { id },
    data: {
      ...(input.numberOfGuests !== undefined ? { numberOfGuests: input.numberOfGuests } : {}),
      ...(input.bookingDate !== undefined
        ? { bookingDate: parseDateKey(input.bookingDate) }
        : {}),
      ...(input.bookingTime !== undefined ? { bookingTime: input.bookingTime } : {}),
      ...(timing ? { startsAt: timing.startsAt, endsAt: timing.endsAt } : {}),
      ...(input.specialRequests !== undefined
        ? { specialRequests: input.specialRequests || null }
        : {}),
      ...(input.occasion !== undefined ? { occasion: input.occasion || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.cancellationReason !== undefined
        ? { cancellationReason: input.cancellationReason }
        : {}),
      tableId,
      tableNumber,
    },
  });

  await logActivity(user?.id ?? null, "booking.update", "TableBooking", id, {
    bookingNumber: booking.bookingNumber,
  });

  return ok(updated);
});

export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const { booking, user, isStaff } = await loadAuthorised(id);

  if (booking.status === "CANCELLED") {
    throw badRequest("This booking is already cancelled");
  }

  // Customers get a cutoff; staff can always cancel (someone phoned).
  if (!isStaff && !canCancelBooking(booking.startsAt)) {
    throw badRequest(
      "Bookings can only be cancelled more than 2 hours in advance. Please call us.",
    );
  }

  const reason = new URL(req.url).searchParams.get("reason") ?? undefined;

  const cancelled = await prisma.tableBooking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? (isStaff ? "Cancelled by restaurant" : "Cancelled by guest"),
    },
  });

  await logActivity(user?.id ?? null, "booking.cancel", "TableBooking", id, {
    bookingNumber: booking.bookingNumber,
  });

  return ok(cancelled);
});
