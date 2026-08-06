import {
  conflict,
  handler,
  logActivity,
  noContent,
  notFound,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { CACHE_KEYS, invalidate } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { menuCategorySchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const category = await prisma.menuCategory.findUnique({
    where: { id },
    include: {
      items: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!category) throw notFound("Category not found");
  return ok(category);
});

export const PUT = handler(async (req: Request, { params }: Params) => {
  const user = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, menuCategorySchema.partial());

  const existing = await prisma.menuCategory.findUnique({ where: { id } });
  if (!existing) throw notFound("Category not found");

  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.nameDe !== undefined ? { nameDe: input.nameDe || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.descriptionDe !== undefined
        ? { descriptionDe: input.descriptionDe || null }
        : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  const restaurantId = await getRestaurantId();
  await invalidate(CACHE_KEYS.categories(restaurantId), CACHE_KEYS.menu(restaurantId));
  await logActivity(user.id, "menu.category.update", "MenuCategory", id);

  return ok(category);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const user = await requireStaff();
  const { id } = await params;

  const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
  if (itemCount > 0) {
    throw conflict(
      `This category still holds ${itemCount} dish${itemCount === 1 ? "" : "es"}. Move or delete them first.`,
    );
  }

  await prisma.menuCategory.delete({ where: { id } });

  const restaurantId = await getRestaurantId();
  await invalidate(CACHE_KEYS.categories(restaurantId), CACHE_KEYS.menu(restaurantId));
  await logActivity(user.id, "menu.category.delete", "MenuCategory", id);

  return noContent();
});
