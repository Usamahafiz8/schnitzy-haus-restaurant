import { handler, ok, paginate, paginated, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));

  const where = { userId: user.id };

  const [items, total] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(page, pageSize),
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.pointsTransaction.count({ where }),
  ]);

  return ok(paginated(items, total, page, pageSize));
});
