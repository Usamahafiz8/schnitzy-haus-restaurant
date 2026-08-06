import { handler, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * Explicit-restaurant form of `/api/menu/categories`, kept so integrations that
 * address a restaurant by id keep working when a second location is added.
 */
export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) throw notFound("Restaurant not found");

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: id, isActive: true },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return ok(categories);
});
