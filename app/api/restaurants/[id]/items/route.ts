import { handler, notFound, ok, paginate, paginated, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getMenuCategory, MENU_ITEMS, type MenuItemData } from "@/lib/menu-data";
import { menuQuerySchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

/**
 * Explicit-restaurant form of `/api/menu`. Same filters and pagination, over
 * the same hardcoded menu (lib/menu-data.ts) — the `id` just has to resolve to
 * a real restaurant, single-tenant today.
 */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const query = parseQuery(req, menuQuerySchema);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) throw notFound("Restaurant not found");

  const filtered = MENU_ITEMS.filter((item) => {
    if (query.categoryId && item.categoryId !== query.categoryId) return false;
    if (query.available !== undefined && item.isAvailable !== query.available) return false;
    if (query.featured && !item.isFeatured) return false;
    if (query.vegan && !item.isVegan) return false;
    if (query.vegetarian && !item.isVegetarian) return false;
    if (query.glutenFree && !item.isGlutenFree) return false;
    if (query.maxPrice !== undefined && item.price > query.maxPrice) return false;
    if (query.q) {
      const q = query.q.toLowerCase();
      const haystack = `${item.name} ${item.nameDe} ${item.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const categoryDiff =
      (getMenuCategory(a.categoryId)?.displayOrder ?? 0) -
      (getMenuCategory(b.categoryId)?.displayOrder ?? 0);
    return categoryDiff !== 0 ? categoryDiff : a.displayOrder - b.displayOrder;
  });

  const total = sorted.length;
  const { skip, take } = paginate(query.page, query.pageSize);
  const items = sorted.slice(skip, skip + take).map(withCategory);

  return ok(paginated(items, total, query.page, query.pageSize));
});

function withCategory(item: MenuItemData) {
  const category = getMenuCategory(item.categoryId);
  return { ...item, category: category ? { id: category.id, name: category.name, nameDe: category.nameDe } : null };
}
