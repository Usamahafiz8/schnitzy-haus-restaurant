import { handler, ok, paginate, paginated } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Public, approved-only review feed for a specific restaurant. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 10));

  const where = { restaurantId: id, status: "APPROVED" as const };

  const [items, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(page, pageSize),
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        images: true,
        adminResponse: true,
        respondedAt: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true, image: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
  ]);

  return ok({
    ...paginated(items, total, page, pageSize),
    summary: {
      average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      count: aggregate._count,
    },
  });
});
