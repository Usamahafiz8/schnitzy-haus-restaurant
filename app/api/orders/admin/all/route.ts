import type { Prisma } from "@prisma/client";

import { handler, ok, paginate, paginated, parseQuery, requireStaff } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ORDER_LIST_SELECT } from "@/lib/orders";
import { getRestaurantId } from "@/lib/restaurant";
import { orderQuerySchema } from "@/lib/validations";

export const GET = handler(async (req: Request) => {
  await requireStaff();
  const query = parseQuery(req, orderQuerySchema);
  const restaurantId = await getRestaurantId();

  const where: Prisma.OrderWhereInput = {
    restaurantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.orderType ? { orderType: query.orderType } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q, mode: "insensitive" } },
            { customerName: { contains: query.q, mode: "insensitive" } },
            { customerEmail: { contains: query.q, mode: "insensitive" } },
            { customerPhone: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.pageSize),
      select: {
        ...ORDER_LIST_SELECT,
        deliveryAddress: true,
        deliveryCity: true,
        deliveryPostalCode: true,
        specialNotes: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return ok(paginated(items, total, query.page, query.pageSize));
});
