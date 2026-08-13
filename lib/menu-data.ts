/**
 * The menu, hardcoded. There is no MenuItem/MenuCategory table — dishes ship
 * with the code. To change the menu: edit this file and redeploy. To change a
 * photo: drop a same-named file into `public/images/dishes/`.
 *
 * Orders still reference an item by `id` (see `lib/pricing.ts`), but that's a
 * plain string now, not a database foreign key — removing or renaming an item
 * here has no effect on past orders, since each order line already stores its
 * own copy of the name/price at the time it was placed.
 */

export type MenuCategoryData = {
  id: string;
  name: string;
  nameDe: string;
  description: string;
  descriptionDe: string;
  displayOrder: number;
};

export type MenuItemData = {
  id: string;
  categoryId: string;
  name: string;
  nameDe: string;
  description: string;
  descriptionDe: string;
  price: number;
  discountPrice: number | null;
  /** Path under `public/`, e.g. "/images/dishes/schnitzel-burger.jpg". */
  image: string;
  preparationTime: number;
  displayOrder: number;
  /** Sold out today — flip by hand and redeploy; there's no admin toggle anymore. */
  isAvailable: boolean;
  isFeatured: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  calories: number | null;
  allergens: string[];
};

export const MENU_CATEGORIES: MenuCategoryData[] = [
  {
    id: "burgers",
    name: "Burgers",
    nameDe: "Burger",
    description: "Hand-made patties, buns from a local bakery, our own sauces",
    descriptionDe: "Handgemachte Patties, Buns vom Bäcker um die Ecke, eigene Saucen",
    displayOrder: 0,
  },
  {
    id: "bowls",
    name: "Bowls",
    nameDe: "Bowls",
    description: "Everything from the burger, minus the bun",
    descriptionDe: "Alles vom Burger, nur ohne Bun",
    displayOrder: 1,
  },
  {
    id: "sides",
    name: "Sides",
    nameDe: "Beilagen",
    description: "Everything that belongs alongside",
    descriptionDe: "Alles, was dazugehört",
    displayOrder: 2,
  },
  {
    id: "desserts",
    name: "Desserts",
    nameDe: "Desserts",
    description: "Save room",
    descriptionDe: "Lass Platz",
    displayOrder: 3,
  },
  {
    id: "drinks",
    name: "Drinks",
    nameDe: "Getränke",
    description: "Cold, and within reach",
    descriptionDe: "Kalt und griffbereit",
    displayOrder: 4,
  },
];

export const MENU_ITEMS: MenuItemData[] = [
  // --- Burgers ---------------------------------------------------------------
  {
    id: "schnitzel-burger",
    categoryId: "burgers",
    name: "Schnitzel Burger",
    nameDe: "Schnitzel Burger",
    description: "Crispy chicken schnitzel, salad, house sauce.",
    descriptionDe: "Knuspriges Hähnchenschnitzel, Salat, Haus-Sauce.",
    price: 10.9,
    discountPrice: null,
    image: "/images/dishes/schnitzel-burger.jpg",
    preparationTime: 14,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: true,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    calories: 780,
    allergens: ["gluten", "eggs", "milk", "mustard"],
  },
  {
    id: "beef-burger",
    categoryId: "burgers",
    name: "Beef Burger",
    nameDe: "Beef Burger",
    description: "Juicy beef, cheddar, salad, special sauce.",
    descriptionDe: "Saftiges Rindfleisch, Cheddar, Salat, Spezial-Sauce.",
    price: 11.9,
    discountPrice: null,
    image: "/images/dishes/beef-burger.jpg",
    preparationTime: 14,
    displayOrder: 1,
    isAvailable: true,
    isFeatured: true,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    calories: 860,
    allergens: ["gluten", "milk", "eggs", "mustard"],
  },
  {
    id: "double-beef-burger",
    categoryId: "burgers",
    name: "Double Beef Burger",
    nameDe: "Double Beef Burger",
    description: "Two patties, double cheddar, crispy onions, burger sauce.",
    descriptionDe: "Zwei Patties, doppelt Cheddar, Röstzwiebeln, Burger-Sauce.",
    price: 14.9,
    discountPrice: null,
    image: "/images/dishes/double-beef-burger.jpg",
    preparationTime: 16,
    displayOrder: 2,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    calories: 1180,
    allergens: ["gluten", "milk", "eggs", "mustard"],
  },
  {
    id: "crispy-chicken-burger",
    categoryId: "burgers",
    name: "Crispy Chicken Burger",
    nameDe: "Crispy Chicken Burger",
    description: "Buttermilk chicken, coleslaw, pickles, spicy mayo.",
    descriptionDe: "Buttermilch-Hähnchen, Krautsalat, Gurken, scharfe Mayo.",
    price: 11.5,
    discountPrice: null,
    image: "/images/dishes/crispy-chicken-burger.jpg",
    preparationTime: 15,
    displayOrder: 3,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: true,
    calories: 820,
    allergens: ["gluten", "milk", "eggs", "mustard"],
  },
  {
    id: "veggie-burger",
    categoryId: "burgers",
    name: "Veggie Burger",
    nameDe: "Veggie Burger",
    description: "Crisp vegetable patty, herb aioli, tomato, rocket.",
    descriptionDe: "Knuspriges Gemüse-Patty, Kräuter-Aioli, Tomate, Rucola.",
    price: 10.5,
    discountPrice: null,
    image: "/images/dishes/veggie-burger.jpg",
    preparationTime: 13,
    displayOrder: 4,
    isAvailable: true,
    isFeatured: false,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    calories: 640,
    allergens: ["gluten", "soy", "mustard"],
  },

  // --- Bowls -------------------------------------------------------------
  {
    id: "schnitzy-bowl",
    categoryId: "bowls",
    name: "Schnitzy Bowl",
    nameDe: "Schnitzy Bowl",
    description: "Crispy chicken, rice, salad, house sauce.",
    descriptionDe: "Knuspriges Hähnchen, Reis, Salat, Haus-Sauce.",
    price: 9.9,
    discountPrice: null,
    image: "/images/dishes/schnitzy-bowl.jpg",
    preparationTime: 12,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: true,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    calories: 690,
    allergens: ["gluten", "eggs", "milk"],
  },
  {
    id: "beef-bowl",
    categoryId: "bowls",
    name: "Beef Bowl",
    nameDe: "Beef Bowl",
    description: "Beef strips, rice, grilled peppers, garlic sauce.",
    descriptionDe: "Rindfleischstreifen, Reis, gegrillte Paprika, Knoblauch-Sauce.",
    price: 11.5,
    discountPrice: null,
    image: "/images/dishes/beef-bowl.jpg",
    preparationTime: 14,
    displayOrder: 1,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isSpicy: false,
    calories: 720,
    allergens: ["milk"],
  },
  {
    id: "veggie-bowl",
    categoryId: "bowls",
    name: "Veggie Bowl",
    nameDe: "Veggie Bowl",
    description: "Roasted vegetables, chickpeas, rice, herb dressing.",
    descriptionDe: "Ofengemüse, Kichererbsen, Reis, Kräuterdressing.",
    price: 9.5,
    discountPrice: null,
    image: "/images/dishes/veggie-bowl.jpg",
    preparationTime: 11,
    displayOrder: 2,
    isAvailable: true,
    isFeatured: false,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 540,
    allergens: ["mustard"],
  },

  // --- Sides ---------------------------------------------------------------
  {
    id: "loaded-fries",
    categoryId: "sides",
    name: "Loaded Fries",
    nameDe: "Loaded Fries",
    description: "Fries, cheese sauce, minced beef, jalapeños.",
    descriptionDe: "Pommes, Käse-Sauce, Rinderhack, Jalapeños.",
    price: 6.9,
    discountPrice: null,
    image: "/images/dishes/loaded-fries.jpg",
    preparationTime: 10,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: true,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: true,
    calories: 720,
    allergens: ["milk"],
  },
  {
    id: "pommes-frites",
    categoryId: "sides",
    name: "Pommes Frites",
    nameDe: "Pommes frites",
    description: "Twice-fried, sea salt, house mayo.",
    descriptionDe: "Zweimal frittiert, Meersalz, Hausmayonnaise.",
    price: 3.9,
    discountPrice: null,
    image: "/images/dishes/pommes-frites.jpg",
    preparationTime: 8,
    displayOrder: 1,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 420,
    allergens: ["eggs"],
  },
  {
    id: "sweet-potato-fries",
    categoryId: "sides",
    name: "Sweet Potato Fries",
    nameDe: "Süßkartoffel-Pommes",
    description: "Sweet potato, paprika salt, chipotle dip.",
    descriptionDe: "Süßkartoffel, Paprikasalz, Chipotle-Dip.",
    price: 4.9,
    discountPrice: null,
    image: "/images/dishes/sweet-potato-fries.jpg",
    preparationTime: 9,
    displayOrder: 2,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 460,
    allergens: ["eggs"],
  },
  {
    id: "onion-rings",
    categoryId: "sides",
    name: "Onion Rings",
    nameDe: "Zwiebelringe",
    description: "Beer-battered, eight per portion, barbecue dip.",
    descriptionDe: "Bierteig, acht Stück, Barbecue-Dip.",
    price: 4.5,
    discountPrice: null,
    image: "/images/dishes/onion-rings.jpg",
    preparationTime: 8,
    displayOrder: 3,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    calories: 480,
    allergens: ["gluten", "milk"],
  },
  {
    id: "coleslaw",
    categoryId: "sides",
    name: "Coleslaw",
    nameDe: "Krautsalat",
    description: "White cabbage, carrot, buttermilk dressing.",
    descriptionDe: "Weißkohl, Karotte, Buttermilch-Dressing.",
    price: 3.5,
    discountPrice: null,
    image: "/images/dishes/coleslaw.jpg",
    preparationTime: 4,
    displayOrder: 4,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 210,
    allergens: ["milk", "mustard"],
  },

  // --- Desserts ------------------------------------------------------------
  {
    id: "new-york-cheesecake",
    categoryId: "desserts",
    name: "New York Cheesecake",
    nameDe: "New York Cheesecake",
    description: "Creamy, dense, with berry compote.",
    descriptionDe: "Cremig, kompakt, mit Beerenkompott.",
    price: 5.5,
    discountPrice: null,
    image: "/images/dishes/new-york-cheesecake.jpg",
    preparationTime: 4,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    calories: 480,
    allergens: ["gluten", "milk", "eggs"],
  },
  {
    id: "brownie",
    categoryId: "desserts",
    name: "Brownie",
    nameDe: "Brownie",
    description: "Warm, dark chocolate, sea salt.",
    descriptionDe: "Warm, Zartbitterschokolade, Meersalz.",
    price: 4.5,
    discountPrice: null,
    image: "/images/dishes/brownie.jpg",
    preparationTime: 5,
    displayOrder: 1,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    calories: 420,
    allergens: ["gluten", "milk", "eggs", "nuts"],
  },

  // --- Drinks --------------------------------------------------------------
  {
    id: "softdrink-0-4l",
    categoryId: "drinks",
    name: "Softdrink 0.4l",
    nameDe: "Softdrink 0,4 l",
    description: "Cola, lemonade or orange.",
    descriptionDe: "Cola, Limonade oder Orange.",
    price: 3.2,
    discountPrice: null,
    image: "/images/dishes/softdrink-0-4l.jpg",
    preparationTime: 2,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: false,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 160,
    allergens: [],
  },
  {
    id: "apfelschorle-0-4l",
    categoryId: "drinks",
    name: "Apfelschorle 0.4l",
    nameDe: "Apfelschorle 0,4 l",
    description: "Cloudy apple juice and sparkling water.",
    descriptionDe: "Naturtrüber Apfelsaft mit Sprudelwasser.",
    price: 3.2,
    discountPrice: null,
    image: "/images/dishes/apfelschorle-0-4l.jpg",
    preparationTime: 2,
    displayOrder: 1,
    isAvailable: true,
    isFeatured: false,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 90,
    allergens: [],
  },
  {
    id: "milkshake",
    categoryId: "drinks",
    name: "Milkshake",
    nameDe: "Milchshake",
    description: "Vanilla, chocolate or strawberry.",
    descriptionDe: "Vanille, Schokolade oder Erdbeere.",
    price: 4.9,
    discountPrice: null,
    image: "/images/dishes/milkshake.jpg",
    preparationTime: 5,
    displayOrder: 2,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isSpicy: false,
    calories: 380,
    allergens: ["milk"],
  },
  {
    id: "pilsner-0-33l",
    categoryId: "drinks",
    name: "Pilsner 0.33l",
    nameDe: "Pils 0,33 l",
    description: "Crisp, dry, cold.",
    descriptionDe: "Herb, trocken, kalt.",
    price: 3.9,
    discountPrice: null,
    image: "/images/dishes/pilsner-0-33l.jpg",
    preparationTime: 2,
    displayOrder: 3,
    isAvailable: true,
    isFeatured: false,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    calories: 130,
    allergens: ["gluten"],
  },
];

export function getMenuCategory(id: string): MenuCategoryData | undefined {
  return MENU_CATEGORIES.find((c) => c.id === id);
}

export function getMenuItem(id: string): MenuItemData | undefined {
  return MENU_ITEMS.find((i) => i.id === id);
}

export function getMenuItemsByIds(ids: string[]): MenuItemData[] {
  const wanted = new Set(ids);
  return MENU_ITEMS.filter((i) => wanted.has(i.id));
}

export function getFeaturedMenuItems(take?: number): MenuItemData[] {
  const featured = MENU_ITEMS.filter((i) => i.isFeatured && i.isAvailable);
  return take ? featured.slice(0, take) : featured;
}

export function getRelatedMenuItems(item: MenuItemData, take = 3): MenuItemData[] {
  return MENU_ITEMS.filter(
    (i) => i.categoryId === item.categoryId && i.id !== item.id && i.isAvailable,
  )
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, take);
}
