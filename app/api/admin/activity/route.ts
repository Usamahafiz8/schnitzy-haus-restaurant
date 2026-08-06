import { handler, ok, paginate, paginated, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 50));
  const userId = url.searchParams.get("userId") ?? undefined;

  const where = userId ? { userId } : {};

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(page, pageSize),
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return ok(paginated(items, total, page, pageSize));
});
