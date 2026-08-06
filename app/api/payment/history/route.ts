import type { Prisma } from "@prisma/client";

import { handler, ok, paginate, paginated, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 20));

  const where: Prisma.OrderWhereInput = {
    customerId: user.id,
    paymentStatus: { in: ["COMPLETED", "REFUNDED"] },
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { paidAt: "desc" },
      ...paginate(page, pageSize),
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        orderType: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return ok(paginated(items, total, page, pageSize));
});
