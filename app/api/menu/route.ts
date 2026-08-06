import type { Prisma } from "@prisma/client";

import { handler, ok, paginate, paginated, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { menuQuerySchema } from "@/lib/validations";

/**
 * Public menu listing. Mirrors `/api/restaurants/:id/items` but resolves the
 * restaurant itself, which is what the storefront actually needs.
 */
export const GET = handler(async (req: Request) => {
  const query = parseQuery(req, menuQuerySchema);
  const restaurantId = await getRestaurantId();

  const where: Prisma.MenuItemWhereInput = {
    restaurantId,
    // Public listing never surfaces archived dishes.
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
            { descriptionDe: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.MenuItemOrderByWithRelationInput[] =
    query.sort === "price_asc"
      ? [{ price: "asc" }]
      : query.sort === "price_desc"
        ? [{ price: "desc" }]
        : query.sort === "name"
          ? [{ name: "asc" }]
          : query.sort === "popular"
            ? [{ isFeatured: "desc" }, { orderItems: { _count: "desc" } }]
            : [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }];

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      orderBy,
      ...paginate(query.page, query.pageSize),
      include: {
        category: { select: { id: true, name: true, nameDe: true, displayOrder: true } },
      },
    }),
    prisma.menuItem.count({ where }),
  ]);

  return ok(paginated(items, total, query.page, query.pageSize));
});
