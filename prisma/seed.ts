/**
 * Seeds a complete, demo-ready restaurant: staff accounts, menu, tables,
 * coupons, and ~6 weeks of order history so the analytics screens have
 * something real to chart. Safe to re-run — it upserts by natural key.
 *
 *   pnpm db:seed
 */
import { PrismaClient, type OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SLUG = "schnitzy-haus";

// Deterministic pseudo-random so re-seeding produces the same demo history.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
/** Dish photos live at a predictable path so real ones can be dropped in later. */
function imagePath(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/images/dishes/${slug}.jpg`;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const OPENING_HOURS = {
  monday: { open: "11:00", close: "23:00", closed: false },
  tuesday: { open: "11:00", close: "23:00", closed: false },
  wednesday: { open: "11:00", close: "23:00", closed: false },
  thursday: { open: "11:00", close: "23:00", closed: false },
  friday: { open: "11:00", close: "23:00", closed: false },
  saturday: { open: "11:00", close: "23:00", closed: false },
  sunday: { open: "11:00", close: "23:00", closed: false },
};

type ItemSeed = {
  name: string;
  nameDe: string;
  description: string;
  descriptionDe: string;
  price: number;
  discountPrice?: number;
  preparationTime: number;
  allergens: string[];
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  isFeatured?: boolean;
  calories?: number;
};

const MENU: { category: string; categoryDe: string; description: string; descriptionDe: string; items: ItemSeed[] }[] = [
  {
    category: "Burgers",
    categoryDe: "Burger",
    description: "Hand-made patties, buns from a local bakery, our own sauces",
    descriptionDe: "Handgemachte Patties, Buns vom Bäcker um die Ecke, eigene Saucen",
    items: [
      {
        name: "Schnitzel Burger",
        nameDe: "Schnitzel Burger",
        description: "Crispy chicken schnitzel, salad, house sauce.",
        descriptionDe: "Knuspriges Hähnchenschnitzel, Salat, Haus-Sauce.",
        price: 10.9,
        preparationTime: 14,
        allergens: ["gluten", "eggs", "milk", "mustard"],
        isFeatured: true,
        calories: 780,
      },
      {
        name: "Beef Burger",
        nameDe: "Beef Burger",
        description: "Juicy beef, cheddar, salad, special sauce.",
        descriptionDe: "Saftiges Rindfleisch, Cheddar, Salat, Spezial-Sauce.",
        price: 11.9,
        preparationTime: 14,
        allergens: ["gluten", "milk", "eggs", "mustard"],
        isFeatured: true,
        calories: 860,
      },
      {
        name: "Double Beef Burger",
        nameDe: "Double Beef Burger",
        description: "Two patties, double cheddar, crispy onions, burger sauce.",
        descriptionDe: "Zwei Patties, doppelt Cheddar, Röstzwiebeln, Burger-Sauce.",
        price: 14.9,
        preparationTime: 16,
        allergens: ["gluten", "milk", "eggs", "mustard"],
        calories: 1180,
      },
      {
        name: "Crispy Chicken Burger",
        nameDe: "Crispy Chicken Burger",
        description: "Buttermilk chicken, coleslaw, pickles, spicy mayo.",
        descriptionDe: "Buttermilch-Hähnchen, Krautsalat, Gurken, scharfe Mayo.",
        price: 11.5,
        preparationTime: 15,
        allergens: ["gluten", "milk", "eggs", "mustard"],
        isSpicy: true,
        calories: 820,
      },
      {
        name: "Veggie Burger",
        nameDe: "Veggie Burger",
        description: "Crisp vegetable patty, herb aioli, tomato, rocket.",
        descriptionDe: "Knuspriges Gemüse-Patty, Kräuter-Aioli, Tomate, Rucola.",
        price: 10.5,
        preparationTime: 13,
        allergens: ["gluten", "soy", "mustard"],
        isVegan: true,
        isVegetarian: true,
        calories: 640,
      },
    ],
  },
  {
    category: "Bowls",
    categoryDe: "Bowls",
    description: "Everything from the burger, minus the bun",
    descriptionDe: "Alles vom Burger, nur ohne Bun",
    items: [
      {
        name: "Schnitzy Bowl",
        nameDe: "Schnitzy Bowl",
        description: "Crispy chicken, rice, salad, house sauce.",
        descriptionDe: "Knuspriges Hähnchen, Reis, Salat, Haus-Sauce.",
        price: 9.9,
        preparationTime: 12,
        allergens: ["gluten", "eggs", "milk"],
        isFeatured: true,
        calories: 690,
      },
      {
        name: "Beef Bowl",
        nameDe: "Beef Bowl",
        description: "Beef strips, rice, grilled peppers, garlic sauce.",
        descriptionDe: "Rindfleischstreifen, Reis, gegrillte Paprika, Knoblauch-Sauce.",
        price: 11.5,
        preparationTime: 14,
        allergens: ["milk"],
        isGlutenFree: true,
        calories: 720,
      },
      {
        name: "Veggie Bowl",
        nameDe: "Veggie Bowl",
        description: "Roasted vegetables, chickpeas, rice, herb dressing.",
        descriptionDe: "Ofengemüse, Kichererbsen, Reis, Kräuterdressing.",
        price: 9.5,
        preparationTime: 11,
        allergens: ["mustard"],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 540,
      },
    ],
  },
  {
    category: "Sides",
    categoryDe: "Beilagen",
    description: "Everything that belongs alongside",
    descriptionDe: "Alles, was dazugehört",
    items: [
      {
        name: "Loaded Fries",
        nameDe: "Loaded Fries",
        description: "Fries, cheese sauce, minced beef, jalapeños.",
        descriptionDe: "Pommes, Käse-Sauce, Rinderhack, Jalapeños.",
        price: 6.9,
        preparationTime: 10,
        allergens: ["milk"],
        isFeatured: true,
        isSpicy: true,
        calories: 720,
      },
      {
        name: "Pommes Frites",
        nameDe: "Pommes frites",
        description: "Twice-fried, sea salt, house mayo.",
        descriptionDe: "Zweimal frittiert, Meersalz, Hausmayonnaise.",
        price: 3.9,
        preparationTime: 8,
        allergens: ["eggs"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 420,
      },
      {
        name: "Sweet Potato Fries",
        nameDe: "Süßkartoffel-Pommes",
        description: "Sweet potato, paprika salt, chipotle dip.",
        descriptionDe: "Süßkartoffel, Paprikasalz, Chipotle-Dip.",
        price: 4.9,
        preparationTime: 9,
        allergens: ["eggs"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 460,
      },
      {
        name: "Onion Rings",
        nameDe: "Zwiebelringe",
        description: "Beer-battered, eight per portion, barbecue dip.",
        descriptionDe: "Bierteig, acht Stück, Barbecue-Dip.",
        price: 4.5,
        preparationTime: 8,
        allergens: ["gluten", "milk"],
        isVegetarian: true,
        calories: 480,
      },
      {
        name: "Coleslaw",
        nameDe: "Krautsalat",
        description: "White cabbage, carrot, buttermilk dressing.",
        descriptionDe: "Weißkohl, Karotte, Buttermilch-Dressing.",
        price: 3.5,
        preparationTime: 4,
        allergens: ["milk", "mustard"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 210,
      },
    ],
  },
  {
    category: "Desserts",
    categoryDe: "Desserts",
    description: "Save room",
    descriptionDe: "Lass Platz",
    items: [
      {
        name: "New York Cheesecake",
        nameDe: "New York Cheesecake",
        description: "Creamy, dense, with berry compote.",
        descriptionDe: "Cremig, kompakt, mit Beerenkompott.",
        price: 5.5,
        preparationTime: 4,
        allergens: ["gluten", "milk", "eggs"],
        isVegetarian: true,
        calories: 480,
      },
      {
        name: "Brownie",
        nameDe: "Brownie",
        description: "Warm, dark chocolate, sea salt.",
        descriptionDe: "Warm, Zartbitterschokolade, Meersalz.",
        price: 4.5,
        preparationTime: 5,
        allergens: ["gluten", "milk", "eggs", "nuts"],
        isVegetarian: true,
        calories: 420,
      },
    ],
  },
  {
    category: "Drinks",
    categoryDe: "Getränke",
    description: "Cold, and within reach",
    descriptionDe: "Kalt und griffbereit",
    items: [
      {
        name: "Softdrink 0.4l",
        nameDe: "Softdrink 0,4 l",
        description: "Cola, lemonade or orange.",
        descriptionDe: "Cola, Limonade oder Orange.",
        price: 3.2,
        preparationTime: 2,
        allergens: [],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 160,
      },
      {
        name: "Apfelschorle 0.4l",
        nameDe: "Apfelschorle 0,4 l",
        description: "Cloudy apple juice and sparkling water.",
        descriptionDe: "Naturtrüber Apfelsaft mit Sprudelwasser.",
        price: 3.2,
        preparationTime: 2,
        allergens: [],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 90,
      },
      {
        name: "Milkshake",
        nameDe: "Milchshake",
        description: "Vanilla, chocolate or strawberry.",
        descriptionDe: "Vanille, Schokolade oder Erdbeere.",
        price: 4.9,
        preparationTime: 5,
        allergens: ["milk"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 380,
      },
      {
        name: "Pilsner 0.33l",
        nameDe: "Pils 0,33 l",
        description: "Crisp, dry, cold.",
        descriptionDe: "Herb, trocken, kalt.",
        price: 3.9,
        preparationTime: 2,
        allergens: ["gluten"],
        isVegan: true,
        isVegetarian: true,
        calories: 130,
      },
    ],
  },
];

const REVIEW_SEEDS = [
  { rating: 5, title: "Bester Burger in Frankfurt", comment: "Das Patty war saftig, der Bun frisch und die Sauce hausgemacht — man schmeckt den Unterschied sofort. Auch am vollen Freitagabend ging es schnell." },
  { rating: 5, title: "Der Schnitzel Burger ist eine Wucht", comment: "Knusprig bis zum Rand, dazu ordentlich Salat. Genau das, was man sich vorstellt, wenn Schnitzel auf Burger trifft." },
  { rating: 4, title: "Sehr gut, aber laut", comment: "Essen top. Ab 20 Uhr wird es voll und laut — für ein ruhiges Gespräch lieber früher kommen." },
  { rating: 5, title: "Bowls sind kein Alibi-Angebot", comment: "Ich hatte die Veggie Bowl und war ehrlich überrascht: ordentlich gewürzt, viel Gemüse, nichts lieblos zusammengeworfen." },
  { rating: 4, title: "Lieferung kam heiß an", comment: "25 Minuten von der Bestellung bis zur Tür, und die Panade war noch knusprig. Die Verpackung macht offensichtlich einen Unterschied." },
  { rating: 5, title: "Loaded Fries für den Tisch", comment: "Käsesauce, Hack, Jalapeños — teilen wollte am Ende trotzdem keiner. Bestellt lieber zwei Portionen." },
  { rating: 3, title: "Gut, aber an dem Abend langsam", comment: "Essen war solide, wir haben allerdings gut 40 Minuten gewartet. Die Getränke wurden immerhin von der Rechnung genommen." },
  { rating: 5, title: "Endlich ein guter Veggie Burger", comment: "Kein trockenes Standard-Patty, sondern etwas Eigenes. Meine Freundin isst vegetarisch und war zum ersten Mal wirklich zufrieden." },
];

async function main() {
  console.log("Seeding Schnitzy Haus…");

  // --- restaurant ----------------------------------------------------------
  const profile = {
    name: "Schnitzy Haus",
    description:
      "Frankfurts Home of Premium Burgers. Handgemachte Burger, knusprige Schnitzel und frische Bowls — auf Bestellung zubereitet.",
    email: "info@schnitzyhaus.de",
    phone: "+49 69 12345678",
    whatsappNumber: "+49 69 12345678",
    address: "Berger Straße 123",
    city: "Frankfurt am Main",
    postalCode: "60316",
    country: "DE",
    // Berger Straße, Frankfurt-Nordend.
    latitude: 50.1268,
    longitude: 8.7047,
    openingHours: OPENING_HOURS,
    cuisineType: "Burgers & Bowls",
  };

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: SLUG },
    // Reconcile the public profile every run so edits here actually land.
    update: profile,
    create: {
      slug: SLUG,
      ...profile,
      currency: "EUR",
      taxRate: 19,
      deliveryFee: 3.5,
      freeDeliveryOver: 45,
      minOrderAmount: 15,
      deliveryRadiusKm: 8,
      pointsPerCurrency: 1,
      pointsPerDiscountUnit: 100,
      bookingSlotMinutes: 30,
      bookingMaxGuests: 12,
      bookingLeadHours: 1,
      bookingDurationMins: 90,
    },
  });

  // --- tables --------------------------------------------------------------
  const tableSpecs = [
    { number: "1", seats: 2, location: "Window" },
    { number: "2", seats: 2, location: "Window" },
    { number: "3", seats: 4, location: "Main room" },
    { number: "4", seats: 4, location: "Main room" },
    { number: "5", seats: 4, location: "Main room" },
    { number: "6", seats: 6, location: "Back room" },
    { number: "7", seats: 6, location: "Back room" },
    { number: "8", seats: 8, location: "Long table" },
    { number: "9", seats: 12, location: "Private room" },
    { number: "T1", seats: 4, location: "Terrace" },
    { number: "T2", seats: 4, location: "Terrace" },
  ];

  for (const spec of tableSpecs) {
    await prisma.restaurantTable.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number: spec.number } },
      update: {},
      create: { ...spec, restaurantId: restaurant.id },
    });
  }

  // --- users ---------------------------------------------------------------
  const password = await bcrypt.hash("Password123", 12);

  const staffSeeds = [
    { email: "admin@schnitzyhaus.de", firstName: "Marta", lastName: "Keller", role: "ADMIN" as const, phone: "+49 69 11111111" },
    { email: "kitchen@schnitzyhaus.de", firstName: "Jonas", lastName: "Brandt", role: "KITCHEN" as const, phone: "+49 69 22222222" },
    { email: "staff@schnitzyhaus.de", firstName: "Aylin", lastName: "Demir", role: "STAFF" as const, phone: "+49 69 33333333" },
    { email: "driver@schnitzyhaus.de", firstName: "Tomas", lastName: "Novak", role: "DELIVERY" as const, phone: "+49 69 44444444" },
  ];

  for (const staff of staffSeeds) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: { role: staff.role },
      create: { ...staff, password, emailVerified: new Date(), locale: "de" },
    });
  }

  const customerSeeds = [
    { email: "customer@example.com", firstName: "Lena", lastName: "Fischer", phone: "+49 170 1112223", locale: "de" as const },
    { email: "sam@example.com", firstName: "Sam", lastName: "Okafor", phone: "+49 170 2223334", locale: "de" as const },
    { email: "mira@example.com", firstName: "Mira", lastName: "Bauer", phone: "+49 170 3334445", locale: "de" as const },
    { email: "james@example.com", firstName: "James", lastName: "Whitfield", phone: "+49 170 4445556", locale: "de" as const },
    { email: "yusuf@example.com", firstName: "Yusuf", lastName: "Aydin", phone: "+49 170 5556667", locale: "de" as const },
    { email: "clara@example.com", firstName: "Clara", lastName: "Schmitt", phone: "+49 170 6667778", locale: "de" as const },
  ];

  const customers = [];
  for (const customer of customerSeeds) {
    customers.push(
      await prisma.user.upsert({
        where: { email: customer.email },
        update: {},
        create: { ...customer, password, role: "CUSTOMER", emailVerified: new Date() },
      }),
    );
  }

  await prisma.address.deleteMany({ where: { userId: customers[0].id } });
  await prisma.address.create({
    data: {
      userId: customers[0].id,
      label: "Home",
      line1: "Hanauer Landstraße 40",
      city: "Frankfurt am Main",
      postalCode: "60314",
      country: "DE",
      latitude: 50.1136,
      longitude: 8.7189,
      isDefault: true,
    },
  });

  // --- menu ----------------------------------------------------------------
  const allItems: { id: string; price: number; discountPrice: number | null; name: string; prep: number }[] = [];

  for (const [index, group] of MENU.entries()) {
    const existing = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, name: group.category },
    });

    const category =
      existing ??
      (await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: group.category,
          nameDe: group.categoryDe,
          description: group.description,
          descriptionDe: group.descriptionDe,
          displayOrder: index,
        },
      }));

    for (const [itemIndex, item] of group.items.entries()) {
      const found = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, name: item.name },
      });

      const record =
        found ??
        (await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: item.name,
            nameDe: item.nameDe,
            description: item.description,
            descriptionDe: item.descriptionDe,
            price: item.price,
            discountPrice: item.discountPrice ?? null,
            image: imagePath(item.name),
            isArchived: false,
            preparationTime: item.preparationTime,
            displayOrder: itemIndex,
            allergens: item.allergens,
            isVegan: item.isVegan ?? false,
            isVegetarian: item.isVegetarian ?? item.isVegan ?? false,
            isGlutenFree: item.isGlutenFree ?? false,
            isSpicy: item.isSpicy ?? false,
            isFeatured: item.isFeatured ?? false,
            calories: item.calories ?? null,
          },
        }));

      allItems.push({
        id: record.id,
        price: Number(record.price),
        discountPrice: record.discountPrice === null ? null : Number(record.discountPrice),
        name: record.name,
        prep: record.preparationTime,
      });
    }
  }

  // --- reconcile: retire anything no longer on the menu ---------------------
  // Re-running the seed after the menu changes would otherwise leave the old
  // dishes behind. Items that appear in an order are hidden rather than
  // deleted, which is the same rule the admin API enforces, so past receipts
  // keep resolving.
  const seededNames = new Set(MENU.flatMap((g) => g.items.map((i) => i.name)));
  const stale = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, name: { notIn: [...seededNames] } },
    select: { id: true, name: true, _count: { select: { orderItems: true } } },
  });

  if (stale.length > 0) {
    const deletable = stale.filter((i) => i._count.orderItems === 0).map((i) => i.id);
    const retire = stale.filter((i) => i._count.orderItems > 0).map((i) => i.id);

    await prisma.favorite.deleteMany({ where: { menuItemId: { in: deletable } } });
    await prisma.menuItem.deleteMany({ where: { id: { in: deletable } } });
    await prisma.menuItem.updateMany({
      where: { id: { in: retire } },
      data: { isArchived: true, isAvailable: false, isFeatured: false },
    });

    console.log(`Reconciled menu: removed ${deletable.length}, retired ${retire.length}.`);
  }

  // Empty categories left behind by the reconcile above.
  const emptyCategories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id, items: { none: {} } },
    select: { id: true },
  });
  if (emptyCategories.length > 0) {
    await prisma.menuCategory.deleteMany({
      where: { id: { in: emptyCategories.map((c) => c.id) } },
    });
    console.log(`Removed ${emptyCategories.length} empty categor${emptyCategories.length === 1 ? "y" : "ies"}.`);
  }

  // --- coupons -------------------------------------------------------------
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400_000);

  const coupons = [
    {
      code: "WILLKOMMEN10",
      description: "10% off your first order",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      minOrderAmount: 20,
      maxDiscount: 10,
      usageLimit: 500,
      perUserLimit: 1,
    },
    {
      code: "SCHNITZEL5",
      description: "€5 off orders over €35",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 5,
      minOrderAmount: 35,
      maxDiscount: null,
      usageLimit: 200,
      perUserLimit: 3,
    },
    {
      code: "LUNCH15",
      description: "15% off weekday lunch orders",
      discountType: "PERCENTAGE" as const,
      discountValue: 15,
      minOrderAmount: 25,
      maxDiscount: 12,
      usageLimit: null,
      perUserLimit: null,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: { ...coupon, restaurantId: restaurant.id, validFrom: now, validTo: in90Days },
    });
  }

  // --- order history -------------------------------------------------------
  const existingOrders = await prisma.order.count({ where: { restaurantId: restaurant.id } });

  if (existingOrders === 0) {
    console.log("Generating 6 weeks of order history…");

    const statuses: OrderStatus[] = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED"];
    const types = ["DELIVERY", "PICKUP", "DINE_IN", "DELIVERY", "PICKUP"] as const;
    const counters = new Map<string, number>();

    for (let daysAgo = 42; daysAgo >= 0; daysAgo--) {
      const day = new Date(now.getTime() - daysAgo * 86400_000);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const orderCount = isWeekend ? randInt(10, 18) : randInt(5, 12);

      for (let i = 0; i < orderCount; i++) {
        const customer = pick(customers);
        const orderType = pick([...types]);
        // Lunch and dinner peaks, with a thinner tail between.
        const hour = rand() < 0.4 ? randInt(11, 14) : randInt(17, 21);
        const createdAt = new Date(day);
        createdAt.setHours(hour, randInt(0, 59), 0, 0);

        const lineCount = randInt(1, 4);
        const chosen = new Map<string, number>();
        for (let l = 0; l < lineCount; l++) {
          const item = pick(allItems);
          chosen.set(item.id, (chosen.get(item.id) ?? 0) + randInt(1, 2));
        }

        const lines = [...chosen.entries()].map(([itemId, quantity]) => {
          const item = allItems.find((x) => x.id === itemId)!;
          const unitPrice = item.discountPrice ?? item.price;
          return {
            menuItemId: item.id,
            name: item.name,
            unitPrice,
            quantity,
            lineTotal: round2(unitPrice * quantity),
          };
        });

        const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
        if (orderType === "DELIVERY" && subtotal < 15) continue;

        const deliveryFee = orderType === "DELIVERY" && subtotal < 45 ? 3.5 : 0;
        const discountAmount = rand() < 0.15 ? round2(subtotal * 0.1) : 0;
        const taxableBase = round2(subtotal - discountAmount + deliveryFee);
        const tax = round2(taxableBase - taxableBase / 1.19);
        const totalAmount = taxableBase;

        const status = daysAgo === 0 && i > orderCount - 3 ? "PREPARING" : pick(statuses);
        const key = dateKey(createdAt);
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);

        const order = await prisma.order.create({
          data: {
            restaurantId: restaurant.id,
            customerId: customer.id,
            orderNumber: `SH-${key.replace(/-/g, "")}-${String(next).padStart(4, "0")}`,
            subtotal,
            tax,
            deliveryFee,
            discountAmount,
            totalAmount,
            couponCode: discountAmount > 0 ? "WILLKOMMEN10" : null,
            pointsEarned: status === "CANCELLED" ? 0 : Math.floor(subtotal - discountAmount),
            orderType,
            status,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            customerPhone: customer.phone ?? "",
            deliveryAddress: orderType === "DELIVERY" ? "Hanauer Landstraße 40" : null,
            deliveryCity: orderType === "DELIVERY" ? "Frankfurt am Main" : null,
            deliveryPostalCode: orderType === "DELIVERY" ? "60314" : null,
            paymentStatus: status === "CANCELLED" ? "REFUNDED" : "COMPLETED",
            paymentMethod: rand() < 0.75 ? "STRIPE" : "CASH",
            paidAt: createdAt,
            createdAt,
            updatedAt: createdAt,
            actualDeliveryTime:
              status === "DELIVERED" ? new Date(createdAt.getTime() + randInt(20, 50) * 60_000) : null,
            items: { create: lines },
            statusHistory: {
              create: [{ status, createdAt }],
            },
          },
        });

        // Loyalty accrual, so the rewards screens have real balances.
        if (status !== "CANCELLED") {
          const account = await prisma.loyaltyAccount.upsert({
            where: { restaurantId_customerId: { restaurantId: restaurant.id, customerId: customer.id } },
            update: {
              points: { increment: Math.floor(subtotal - discountAmount) },
              lifetimePoints: { increment: Math.floor(subtotal - discountAmount) },
              totalSpent: { increment: totalAmount },
              orderCount: { increment: 1 },
            },
            create: {
              restaurantId: restaurant.id,
              customerId: customer.id,
              points: Math.floor(subtotal - discountAmount),
              lifetimePoints: Math.floor(subtotal - discountAmount),
              totalSpent: totalAmount,
              orderCount: 1,
            },
          });

          await prisma.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId: customer.id,
              orderId: order.id,
              points: Math.floor(subtotal - discountAmount),
              reason: "EARNED_ORDER",
              createdAt,
            },
          });
        }
      }
    }

    // Hand the per-day counters over to the app, so the first live order of a
    // seeded day continues the sequence instead of colliding with it.
    for (const [day, value] of counters) {
      await prisma.orderCounter.upsert({
        where: { day },
        create: { day, value },
        update: { value },
      });
    }

    // Recompute tiers from lifetime spend.
    const accounts = await prisma.loyaltyAccount.findMany({ where: { restaurantId: restaurant.id } });
    for (const account of accounts) {
      const spent = Number(account.totalSpent);
      const tier = spent >= 2500 ? "PLATINUM" : spent >= 1000 ? "GOLD" : spent >= 250 ? "SILVER" : "BRONZE";
      await prisma.loyaltyAccount.update({ where: { id: account.id }, data: { tier } });
    }
  }

  // --- reviews -------------------------------------------------------------
  if ((await prisma.review.count({ where: { restaurantId: restaurant.id } })) === 0) {
    const reviewable = await prisma.order.findMany({
      where: { restaurantId: restaurant.id, status: "DELIVERED" },
      orderBy: { createdAt: "desc" },
      take: REVIEW_SEEDS.length,
      select: { id: true, customerId: true, createdAt: true },
    });

    for (const [index, review] of REVIEW_SEEDS.entries()) {
      const order = reviewable[index];
      if (!order?.customerId) continue;
      await prisma.review.create({
        data: {
          restaurantId: restaurant.id,
          orderId: order.id,
          customerId: order.customerId,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          status: index < 6 ? "APPROVED" : "PENDING",
          createdAt: new Date(order.createdAt.getTime() + 86400_000),
          ...(index === 0
            ? {
                adminResponse:
                  "Thank you — we'll pass that straight to the kitchen. See you again soon!",
                respondedAt: new Date(),
              }
            : {}),
        },
      });
    }
  }

  // --- upcoming bookings ---------------------------------------------------
  if ((await prisma.tableBooking.count({ where: { restaurantId: restaurant.id } })) === 0) {
    const tables = await prisma.restaurantTable.findMany({ where: { restaurantId: restaurant.id } });
    const bookingCounters = new Map<string, number>();

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const count = randInt(2, 5);
      for (let i = 0; i < count; i++) {
        const date = new Date(now.getTime() + dayOffset * 86400_000);
        date.setHours(0, 0, 0, 0);

        const guests = randInt(2, 6);
        const hour = randInt(18, 20);
        const minute = pick([0, 30]);
        const startsAt = new Date(date);
        startsAt.setHours(hour, minute, 0, 0);
        const endsAt = new Date(startsAt.getTime() + 90 * 60_000);

        const table = tables.find((t) => t.seats >= guests) ?? null;
        const customer = pick(customers);
        const key = dateKey(date);
        bookingCounters.set(key, i + 1);

        await prisma.tableBooking.create({
          data: {
            restaurantId: restaurant.id,
            customerId: customer.id,
            bookingNumber: `BK-${key.replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`,
            numberOfGuests: guests,
            bookingDate: date,
            bookingTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
            startsAt,
            endsAt,
            tableId: table?.id ?? null,
            tableNumber: table?.number ?? null,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            customerPhone: customer.phone ?? "",
            occasion: rand() < 0.2 ? pick(["birthday", "anniversary", "business"]) : null,
            specialRequests: rand() < 0.3 ? "Window table if possible" : null,
            status: "CONFIRMED",
          },
        });
      }
    }

    for (const [day, value] of bookingCounters) {
      await prisma.bookingCounter.upsert({
        where: { day },
        create: { day, value },
        update: { value },
      });
    }
  }

  // --- favourites & a support inquiry --------------------------------------
  const featured = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, isFeatured: true },
    take: 3,
  });
  for (const item of featured) {
    await prisma.favorite.upsert({
      where: { userId_menuItemId: { userId: customers[0].id, menuItemId: item.id } },
      update: {},
      create: { userId: customers[0].id, menuItemId: item.id },
    });
  }

  if ((await prisma.inquiry.count()) === 0) {
    await prisma.inquiry.create({
      data: {
        restaurantId: restaurant.id,
        userId: customers[1].id,
        name: `${customers[1].firstName} ${customers[1].lastName}`,
        email: customers[1].email,
        phone: customers[1].phone,
        subject: "Private room for 20 people",
        message:
          "Do you take group bookings for around 20 people on a Thursday evening? Company dinner in early October.",
      },
    });
  }

  const [orderTotal, itemTotal, bookingTotal] = await Promise.all([
    prisma.order.count(),
    prisma.menuItem.count(),
    prisma.tableBooking.count(),
  ]);

  console.log(`
Seed complete.
  restaurant   ${restaurant.name} (${restaurant.slug})
  menu items   ${itemTotal}
  orders       ${orderTotal}
  bookings     ${bookingTotal}

Sign in with:
  admin@schnitzyhaus.de    / Password123   (ADMIN)
  kitchen@schnitzyhaus.de  / Password123   (KITCHEN)
  staff@schnitzyhaus.de    / Password123   (STAFF)
  driver@schnitzyhaus.de   / Password123   (DELIVERY)
  customer@example.com     / Password123   (CUSTOMER)
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
