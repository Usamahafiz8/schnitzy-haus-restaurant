import {
  created,
  handler,
  logActivity,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { CACHE_KEYS, invalidate } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { menuCategorySchema } from "@/lib/validations";

export const GET = handler(async (req: Request) => {
  const restaurantId = await getRestaurantId();
  const includeInactive =
    new URL(req.url).searchParams.get("includeInactive") === "true";

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return ok(categories);
});

export const POST = handler(async (req: Request) => {
  const user = await requireStaff();
  const input = await parseBody(req, menuCategorySchema);
  const restaurantId = await getRestaurantId();

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId,
      name: input.name,
      nameDe: input.nameDe || null,
      description: input.description || null,
      descriptionDe: input.descriptionDe || null,
      displayOrder: input.displayOrder,
      imageUrl: input.imageUrl || null,
      isActive: input.isActive,
    },
  });

  await invalidate(CACHE_KEYS.categories(restaurantId), CACHE_KEYS.menu(restaurantId));
  await logActivity(user.id, "menu.category.create", "MenuCategory", category.id, {
    name: category.name,
  });

  return created(category);
});
