import { handler, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { MENU_CATEGORIES, MENU_ITEMS } from "@/lib/menu-data";

type Params = { params: Promise<{ id: string }> };

/**
 * Explicit-restaurant form of `/api/menu/categories`, kept so integrations
 * that address a restaurant by id keep working when a second location is
 * added. Categories are hardcoded (lib/menu-data.ts), same as the menu.
 */
export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) throw notFound("Restaurant not found");

  const categories = [...MENU_CATEGORIES]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      ...category,
      _count: { items: MENU_ITEMS.filter((i) => i.categoryId === category.id).length },
    }));

  return ok(categories);
});
