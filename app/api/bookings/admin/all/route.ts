import type { Prisma } from "@prisma/client";

import { handler, ok, paginate, paginated, requireStaff } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { parseDateKey } from "@/lib/utils";

export const GET = handler(async (req: Request) => {
  await requireStaff();
  const url = new URL(req.url);
  const restaurantId = await getRestaurantId();

  const date = url.searchParams.get("date");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 50));

  const where: Prisma.TableBookingWhereInput = {
    restaurantId,
    ...(date ? { bookingDate: parseDateKey(date) } : {}),
    ...(status ? { status: status as Prisma.EnumBookingStatusFilter["equals"] } : {}),
    ...(q
      ? {
          OR: [
            { bookingNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q } },
            { customerEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tableBooking.findMany({
      where,
      orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }],
      ...paginate(page, pageSize),
      include: { table: { select: { id: true, number: true, seats: true, location: true } } },
    }),
    prisma.tableBooking.count({ where }),
  ]);

  return ok(paginated(items, total, page, pageSize));
});
