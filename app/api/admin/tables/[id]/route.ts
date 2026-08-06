import {
  conflict,
  handler,
  logActivity,
  noContent,
  notFound,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { tableSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, tableSchema.partial());

  const existing = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!existing) throw notFound("Table not found");

  const table = await prisma.restaurantTable.update({
    where: { id },
    data: {
      ...(input.number !== undefined ? { number: input.number } : {}),
      ...(input.seats !== undefined ? { seats: input.seats } : {}),
      ...(input.location !== undefined ? { location: input.location || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await logActivity(staff.id, "table.update", "RestaurantTable", id);

  return ok(table);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;

  const upcoming = await prisma.tableBooking.count({
    where: {
      tableId: id,
      startsAt: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
    },
  });

  if (upcoming > 0) {
    throw conflict(
      `This table has ${upcoming} upcoming booking${upcoming === 1 ? "" : "s"}. Move them first.`,
    );
  }

  // Keep the row so past bookings still resolve a table number.
  await prisma.restaurantTable.update({
    where: { id },
    data: { isActive: false, status: "OUT_OF_SERVICE" },
  });

  await logActivity(staff.id, "table.retire", "RestaurantTable", id);

  return noContent();
});
