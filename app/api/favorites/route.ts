import { z } from "zod";

import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = handler(async () => {
  const user = await requireUser();

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      menuItem: {
        include: { category: { select: { id: true, name: true, nameDe: true } } },
      },
    },
  });

  return ok(favorites);
});

const toggleSchema = z.object({ menuItemId: z.string().uuid() });

/** Idempotent toggle — the heart button doesn't need to know current state. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { menuItemId } = await parseBody(req, toggleSchema);

  const existing = await prisma.favorite.findUnique({
    where: { userId_menuItemId: { userId: user.id, menuItemId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return ok({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, menuItemId } });
  return ok({ favorited: true });
});
