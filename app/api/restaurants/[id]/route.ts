import { handler, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { RESTAURANT_CONFIG } from "@/lib/restaurant-config";
import { isOpenAt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const row = await prisma.restaurant.findUnique({ where: { id } });
  if (!row) throw notFound("Restaurant not found");

  const restaurant = { ...RESTAURANT_CONFIG, id: row.id, isActive: row.isActive };

  return ok({
    ...restaurant,
    isOpenNow: isOpenAt(restaurant.openingHours),
  });
});
