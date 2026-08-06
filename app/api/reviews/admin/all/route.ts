import type { Prisma } from "@prisma/client";

import { handler, ok, paginate, paginated, requireStaff } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export const GET = handler(async (req: Request) => {
  await requireStaff();
  const url = new URL(req.url);
  const restaurantId = await getRestaurantId();

  const status = url.searchParams.get("status");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 20));

  const where: Prisma.ReviewWhereInput = {
    restaurantId,
    ...(status ? { status: status as Prisma.EnumReviewStatusFilter["equals"] } : {}),
  };

  const [items, total, counts] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      ...paginate(page, pageSize),
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({
      by: ["status"],
      where: { restaurantId },
      _count: true,
    }),
  ]);

  return ok({
    ...paginated(items, total, page, pageSize),
    counts: {
      PENDING: counts.find((c) => c.status === "PENDING")?._count ?? 0,
      APPROVED: counts.find((c) => c.status === "APPROVED")?._count ?? 0,
      REJECTED: counts.find((c) => c.status === "REJECTED")?._count ?? 0,
    },
  });
});
