import { z } from "zod";

import { badRequest, handler, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getMenuCategory, getMenuItem } from "@/lib/menu-data";
import { menuItemIdSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const user = await requireUser();

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // The menu lives in code now — resolve each favorite against it and drop
  // any that point at a dish that's since been removed.
  const withItems = favorites.flatMap((f) => {
    const item = getMenuItem(f.menuItemId);
    if (!item) return [];
    const category = getMenuCategory(item.categoryId);
    return [{ ...f, menuItem: { ...item, category } }];
  });

  return ok(withItems);
});

const toggleSchema = z.object({ menuItemId: menuItemIdSchema });

/** Idempotent toggle — the heart button doesn't need to know current state. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { menuItemId } = await parseBody(req, toggleSchema);

  // No database FK to enforce this now that the menu is hardcoded.
  if (!getMenuItem(menuItemId)) throw badRequest("That dish doesn't exist");

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
