import {
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
import { menuItemBaseSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, nameDe: true } },
      restaurant: { select: { currency: true } },
    },
  });

  if (!item) throw notFound("We couldn't find that dish");
  return ok(item);
});

// The create schema is a refined object, so `.partial()` needs the inner shape.
const patchSchema = menuItemBaseSchema.partial();

export const PUT = handler(async (req: Request, { params }: Params) => {
  const user = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, patchSchema);

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw notFound("We couldn't find that dish");

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.nameDe !== undefined ? { nameDe: input.nameDe || null } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.descriptionDe !== undefined
        ? { descriptionDe: input.descriptionDe || null }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.discountPrice !== undefined
        ? { discountPrice: input.discountPrice ?? null }
        : {}),
      ...(input.image !== undefined ? { image: input.image || null } : {}),
      ...(input.preparationTime !== undefined
        ? { preparationTime: input.preparationTime }
        : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.isVegan !== undefined ? { isVegan: input.isVegan } : {}),
      ...(input.isVegetarian !== undefined ? { isVegetarian: input.isVegetarian } : {}),
      ...(input.isGlutenFree !== undefined ? { isGlutenFree: input.isGlutenFree } : {}),
      ...(input.isSpicy !== undefined ? { isSpicy: input.isSpicy } : {}),
      ...(input.calories !== undefined ? { calories: input.calories ?? null } : {}),
      ...(input.allergens !== undefined ? { allergens: input.allergens } : {}),
    },
  });

  await invalidate(CACHE_KEYS.menu(item.restaurantId));
  await logActivity(user.id, "menu.item.update", "MenuItem", id, { name: item.name });

  return ok(item);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const user = await requireStaff();
  const { id } = await params;

  const item = await prisma.menuItem.findUnique({
    where: { id },
    select: { id: true, name: true, restaurantId: true, _count: { select: { orderItems: true } } },
  });
  if (!item) throw notFound("We couldn't find that dish");

  // Never break order history: a dish that has been ordered is retired, not
  // deleted, so past receipts keep resolving.
  if (item._count.orderItems > 0) {
    await prisma.menuItem.update({
      where: { id },
      data: { isArchived: true, isAvailable: false, isFeatured: false },
    });
    await invalidate(CACHE_KEYS.menu(item.restaurantId));
    await logActivity(user.id, "menu.item.retire", "MenuItem", id, { name: item.name });
    return ok({ retired: true, reason: "This dish appears in past orders, so it was hidden instead of deleted." });
  }

  await prisma.menuItem.delete({ where: { id } });
  await invalidate(CACHE_KEYS.menu(item.restaurantId));
  await logActivity(user.id, "menu.item.delete", "MenuItem", id, { name: item.name });

  return noContent();
});
