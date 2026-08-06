import { z } from "zod";

import {
  conflict,
  created,
  handler,
  logActivity,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { tableSchema } from "@/lib/validations";

export const GET = handler(async () => {
  await requireStaff();
  const restaurantId = await getRestaurantId();

  const now = new Date();

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId },
    orderBy: [{ isActive: "desc" }, { number: "asc" }],
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
          endsAt: { gte: now },
        },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          id: true,
          bookingNumber: true,
          startsAt: true,
          endsAt: true,
          numberOfGuests: true,
          customerName: true,
          status: true,
        },
      },
    },
  });

  return ok(tables);
});

export const POST = handler(async (req: Request) => {
  const staff = await requireStaff();
  const input = await parseBody(req, tableSchema);
  const restaurantId = await getRestaurantId();

  const existing = await prisma.restaurantTable.findUnique({
    where: { restaurantId_number: { restaurantId, number: input.number } },
    select: { id: true },
  });
  if (existing) throw conflict(`Table ${input.number} already exists`);

  const table = await prisma.restaurantTable.create({
    data: {
      restaurantId,
      number: input.number,
      seats: input.seats,
      location: input.location || null,
      isActive: input.isActive,
    },
  });

  await logActivity(staff.id, "table.create", "RestaurantTable", table.id, {
    number: table.number,
  });

  return created(table);
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["FREE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"]),
});

/** Front-of-house toggling a table between free and occupied. */
export const PATCH = handler(async (req: Request) => {
  const staff = await requireStaff();
  const { id, status } = await parseBody(req, statusSchema);

  const table = await prisma.restaurantTable.update({
    where: { id },
    data: { status },
  });

  await logActivity(staff.id, "table.status", "RestaurantTable", id, { status });

  return ok(table);
});
