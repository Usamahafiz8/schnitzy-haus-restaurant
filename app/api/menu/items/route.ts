import {
  badRequest,
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
import { menuItemSchema } from "@/lib/validations";
import { z } from "zod";

export const POST = handler(async (req: Request) => {
  const user = await requireStaff();
  const input = await parseBody(req, menuItemSchema);
  const restaurantId = await getRestaurantId();

  const category = await prisma.menuCategory.findFirst({
    where: { id: input.categoryId, restaurantId },
    select: { id: true },
  });
  if (!category) throw badRequest("Pick a category that belongs to this restaurant");

  const item = await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      nameDe: input.nameDe || null,
      description: input.description || null,
      descriptionDe: input.descriptionDe || null,
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      image: input.image || null,
      preparationTime: input.preparationTime,
      displayOrder: input.displayOrder,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
      isVegan: input.isVegan,
      isVegetarian: input.isVegetarian || input.isVegan,
      isGlutenFree: input.isGlutenFree,
      isSpicy: input.isSpicy,
      calories: input.calories ?? null,
      allergens: input.allergens,
    },
  });

  await invalidate(CACHE_KEYS.menu(restaurantId));
  await logActivity(user.id, "menu.item.create", "MenuItem", item.id, { name: item.name });

  return created(item);
});

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(["available", "unavailable", "feature", "unfeature", "delete"]),
});

/** Bulk operations from the admin menu table (select rows -> apply). */
export const PATCH = handler(async (req: Request) => {
  const user = await requireStaff();
  const { ids, action } = await parseBody(req, bulkSchema);
  const restaurantId = await getRestaurantId();

  const scope = { id: { in: ids }, restaurantId };

  if (action === "delete") {
    // Items referenced by an order are soft-removed instead, so history keeps
    // its link. `onDelete: SetNull` would silently orphan those line items.
    const referenced = await prisma.orderItem.findMany({
      where: { menuItemId: { in: ids } },
      select: { menuItemId: true },
      distinct: ["menuItemId"],
    });
    const referencedIds = new Set(
      referenced.map((r) => r.menuItemId).filter((id): id is string => id !== null),
    );
    const deletable = ids.filter((id) => !referencedIds.has(id));

    const [deleted, hidden] = await prisma.$transaction([
      prisma.menuItem.deleteMany({ where: { id: { in: deletable }, restaurantId } }),
      prisma.menuItem.updateMany({
        where: { id: { in: [...referencedIds] }, restaurantId },
        data: { isArchived: true, isAvailable: false, isFeatured: false },
      }),
    ]);

    await invalidate(CACHE_KEYS.menu(restaurantId));
    await logActivity(user.id, "menu.item.bulk-delete", "MenuItem", undefined, {
      deleted: deleted.count,
      hidden: hidden.count,
    });

    return ok({ deleted: deleted.count, hidden: hidden.count });
  }

  const data =
    action === "available"
      ? { isAvailable: true }
      : action === "unavailable"
        ? { isAvailable: false }
        : action === "feature"
          ? { isFeatured: true }
          : { isFeatured: false };

  const result = await prisma.menuItem.updateMany({ where: scope, data });

  await invalidate(CACHE_KEYS.menu(restaurantId));
  await logActivity(user.id, `menu.item.bulk-${action}`, "MenuItem", undefined, {
    count: result.count,
  });

  return ok({ updated: result.count });
});
