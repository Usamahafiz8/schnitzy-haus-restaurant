import { handler, ok, paginate, paginated, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 20));

  const where = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(page, pageSize),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return ok({ ...paginated(items, total, page, pageSize), unread });
});

/** Mark everything read. */
export const PUT = handler(async () => {
  const user = await requireUser();

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return ok({ marked: result.count });
});
