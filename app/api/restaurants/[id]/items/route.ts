import type { Prisma } from "@prisma/client";

import { handler, notFound, ok, paginate, paginated, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/db";
import { menuQuerySchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

/** Explicit-restaurant form of `/api/menu`. Same filters and pagination. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const query = parseQuery(req, menuQuerySchema);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) throw notFound("Restaurant not found");

  const where: Prisma.MenuItemWhereInput = {
    restaurantId: id,
    isArchived: false,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.available !== undefined ? { isAvailable: query.available } : {}),
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.vegan ? { isVegan: true } : {}),
    ...(query.vegetarian ? { isVegetarian: true } : {}),
    ...(query.glutenFree ? { isGlutenFree: true } : {}),
    ...(query.maxPrice ? { price: { lte: query.maxPrice } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { nameDe: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
      ...paginate(query.page, query.pageSize),
      include: { category: { select: { id: true, name: true, nameDe: true } } },
    }),
    prisma.menuItem.count({ where }),
  ]);

  return ok(paginated(items, total, query.page, query.pageSize));
});
