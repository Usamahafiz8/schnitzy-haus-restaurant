import { handler, ok, paginate, paginated, parseQuery } from "@/lib/api";
import { getMenuCategory, MENU_ITEMS, type MenuItemData } from "@/lib/menu-data";
import { menuQuerySchema } from "@/lib/validations";

/**
 * Public menu listing. The menu is hardcoded (lib/menu-data.ts), so this is a
 * filter/sort/paginate over an in-memory array rather than a database query.
 */
export const GET = handler(async (req: Request) => {
  const query = parseQuery(req, menuQuerySchema);

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
      const haystack = `${item.name} ${item.nameDe} ${item.description} ${item.descriptionDe}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (query.sort === "price_asc") return a.price - b.price;
    if (query.sort === "price_desc") return b.price - a.price;
    if (query.sort === "name") return a.name.localeCompare(b.name);
    // No order-count data without a database join anymore; featured stands
    // in for "popular".
    if (query.sort === "popular") return Number(b.isFeatured) - Number(a.isFeatured);

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
  return {
    ...item,
    category: category
      ? { id: category.id, name: category.name, nameDe: category.nameDe, displayOrder: category.displayOrder }
      : null,
  };
}
