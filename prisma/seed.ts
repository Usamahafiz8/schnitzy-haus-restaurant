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
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const OPENING_HOURS = {
  monday: { open: "11:30", close: "22:00", closed: false },
  tuesday: { open: "11:30", close: "22:00", closed: false },
  wednesday: { open: "11:30", close: "22:00", closed: false },
  thursday: { open: "11:30", close: "23:00", closed: false },
  friday: { open: "11:30", close: "23:30", closed: false },
  saturday: { open: "12:00", close: "23:30", closed: false },
  sunday: { open: "12:00", close: "21:00", closed: false },
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
    category: "Starters",
    categoryDe: "Vorspeisen",
    description: "Small plates to open the meal",
    descriptionDe: "Kleine Gerichte zum Auftakt",
    items: [
      {
        name: "Bavarian Pretzel",
        nameDe: "Bayerische Brezn",
        description: "Warm hand-rolled pretzel with obatzda and salted butter.",
        descriptionDe: "Warme handgerollte Brezn mit Obatzda und Salzbutter.",
        price: 5.9,
        preparationTime: 5,
        allergens: ["gluten", "milk"],
        isVegetarian: true,
        calories: 380,
      },
      {
        name: "Potato Soup",
        nameDe: "Kartoffelsuppe",
        description: "Creamy potato and leek soup with marjoram and croutons.",
        descriptionDe: "Cremige Kartoffel-Lauch-Suppe mit Majoran und Croutons.",
        price: 6.5,
        preparationTime: 8,
        allergens: ["gluten", "milk", "celery"],
        isVegetarian: true,
        calories: 290,
      },
      {
        name: "Beetroot Carpaccio",
        nameDe: "Rote-Bete-Carpaccio",
        description: "Thin roasted beetroot, walnut, rocket and horseradish oil.",
        descriptionDe: "Dünn geschnittene geröstete Rote Bete, Walnuss, Rucola und Meerrettichöl.",
        price: 8.5,
        preparationTime: 10,
        allergens: ["nuts"],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 210,
      },
      {
        name: "Camembert Bites",
        nameDe: "Gebackener Camembert",
        description: "Crumbed camembert with cranberry compote.",
        descriptionDe: "Panierter Camembert mit Preiselbeerkompott.",
        price: 7.9,
        preparationTime: 12,
        allergens: ["gluten", "milk", "eggs"],
        isVegetarian: true,
        calories: 450,
      },
    ],
  },
  {
    category: "Schnitzel",
    categoryDe: "Schnitzel",
    description: "The reason we're here. Hand-breaded, fried to order.",
    descriptionDe: "Der Grund, warum es uns gibt. Handpaniert, frisch gebraten.",
    items: [
      {
        name: "Wiener Schnitzel",
        nameDe: "Wiener Schnitzel",
        description: "Veal escalope in golden breadcrumbs, lingonberry, lemon, parsley potatoes.",
        descriptionDe: "Kalbsschnitzel in goldener Panade, Preiselbeeren, Zitrone, Petersilienkartoffeln.",
        price: 24.9,
        preparationTime: 20,
        allergens: ["gluten", "eggs", "milk"],
        isFeatured: true,
        calories: 890,
      },
      {
        name: "Schnitzel Wiener Art",
        nameDe: "Schnitzel Wiener Art",
        description: "The classic, made with pork. Same crunch, friendlier price.",
        descriptionDe: "Der Klassiker vom Schwein. Gleiche Knusprigkeit, freundlicherer Preis.",
        price: 17.9,
        discountPrice: 15.9,
        preparationTime: 18,
        allergens: ["gluten", "eggs", "milk"],
        isFeatured: true,
        calories: 840,
      },
      {
        name: "Jägerschnitzel",
        nameDe: "Jägerschnitzel",
        description: "Pork schnitzel under a rich mushroom and bacon cream sauce, with spätzle.",
        descriptionDe: "Schweineschnitzel mit kräftiger Pilz-Speck-Rahmsoße und Spätzle.",
        price: 19.5,
        preparationTime: 20,
        allergens: ["gluten", "eggs", "milk"],
        isFeatured: true,
        calories: 1050,
      },
      {
        name: "Rahmschnitzel",
        nameDe: "Rahmschnitzel",
        description: "Creamy pepper sauce, buttered egg noodles, chives.",
        descriptionDe: "Cremige Pfeffersoße, Butter-Eiernudeln, Schnittlauch.",
        price: 19.5,
        preparationTime: 20,
        allergens: ["gluten", "eggs", "milk"],
        calories: 990,
      },
      {
        name: "Zigeunerschnitzel",
        nameDe: "Paprikaschnitzel",
        description: "Pork schnitzel with a smoky pepper and paprika sauce. Has a kick.",
        descriptionDe: "Schweineschnitzel mit rauchiger Paprikasoße. Mit Schärfe.",
        price: 18.9,
        preparationTime: 20,
        allergens: ["gluten", "eggs"],
        isSpicy: true,
        calories: 870,
      },
      {
        name: "Celeriac Schnitzel",
        nameDe: "Sellerieschnitzel",
        description: "Thick-cut celeriac, crisp panko crumb, herb aioli. Fully plant based.",
        descriptionDe: "Dick geschnittener Sellerie, knuspriges Panko, Kräuter-Aioli. Rein pflanzlich.",
        price: 16.5,
        preparationTime: 18,
        allergens: ["gluten", "celery", "mustard"],
        isVegan: true,
        isVegetarian: true,
        isFeatured: true,
        calories: 620,
      },
      {
        name: "Gluten-Free Schnitzel",
        nameDe: "Glutenfreies Schnitzel",
        description: "Chicken breast in a rice and corn crumb, fried in a dedicated pan.",
        descriptionDe: "Hähnchenbrust in Reis-Mais-Panade, in separater Pfanne gebraten.",
        price: 19.9,
        preparationTime: 22,
        allergens: ["eggs"],
        isGlutenFree: true,
        calories: 720,
      },
    ],
  },
  {
    category: "Mains",
    categoryDe: "Hauptgerichte",
    description: "Beyond the schnitzel",
    descriptionDe: "Mehr als nur Schnitzel",
    items: [
      {
        name: "Sauerbraten",
        nameDe: "Sauerbraten",
        description: "Four-day marinated beef, raisin gravy, red cabbage, potato dumpling.",
        descriptionDe: "Vier Tage marinierter Rinderbraten, Rosinensoße, Rotkohl, Kartoffelknödel.",
        price: 22.5,
        preparationTime: 25,
        allergens: ["gluten", "milk"],
        calories: 940,
      },
      {
        name: "Bratwurst Platter",
        nameDe: "Bratwurstteller",
        description: "Three Nürnberger sausages, sauerkraut, mustard, farmhouse bread.",
        descriptionDe: "Drei Nürnberger Würstchen, Sauerkraut, Senf, Bauernbrot.",
        price: 14.9,
        preparationTime: 15,
        allergens: ["gluten", "mustard"],
        calories: 780,
      },
      {
        name: "Käsespätzle",
        nameDe: "Käsespätzle",
        description: "Hand-scraped spätzle, mountain cheese, crispy onions.",
        descriptionDe: "Handgeschabte Spätzle, Bergkäse, Röstzwiebeln.",
        price: 15.5,
        preparationTime: 18,
        allergens: ["gluten", "eggs", "milk"],
        isVegetarian: true,
        isFeatured: true,
        calories: 860,
      },
      {
        name: "Mushroom Goulash",
        nameDe: "Pilzgulasch",
        description: "Slow-cooked wild mushrooms, smoked paprika, bread dumpling.",
        descriptionDe: "Langsam geschmorte Waldpilze, geräuchertes Paprikapulver, Semmelknödel.",
        price: 16.9,
        preparationTime: 20,
        allergens: ["gluten"],
        isVegan: true,
        isVegetarian: true,
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
        name: "Pommes Frites",
        nameDe: "Pommes frites",
        description: "Twice-fried, sea salt, house mayo.",
        descriptionDe: "Zweimal frittiert, Meersalz, Hausmayonnaise.",
        price: 4.5,
        preparationTime: 8,
        allergens: ["eggs"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 420,
      },
      {
        name: "Potato Salad",
        nameDe: "Kartoffelsalat",
        description: "Warm, with stock, vinegar and chives — the southern way.",
        descriptionDe: "Warm, mit Brühe, Essig und Schnittlauch – nach süddeutscher Art.",
        price: 4.9,
        preparationTime: 5,
        allergens: ["mustard", "celery"],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 310,
      },
      {
        name: "Cucumber Salad",
        nameDe: "Gurkensalat",
        description: "Shaved cucumber, dill, sour cream.",
        descriptionDe: "Gehobelte Gurke, Dill, Schmand.",
        price: 4.5,
        preparationTime: 5,
        allergens: ["milk"],
        isVegetarian: true,
        isGlutenFree: true,
        calories: 120,
      },
      {
        name: "Red Cabbage",
        nameDe: "Rotkohl",
        description: "Braised with apple, clove and a little red wine.",
        descriptionDe: "Geschmort mit Apfel, Nelke und einem Schuss Rotwein.",
        price: 4.5,
        preparationTime: 5,
        allergens: [],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 150,
      },
    ],
  },
  {
    category: "Desserts",
    categoryDe: "Desserts",
    description: "Save room",
    descriptionDe: "Lassen Sie Platz",
    items: [
      {
        name: "Apple Strudel",
        nameDe: "Apfelstrudel",
        description: "Warm strudel, raisins, cinnamon, vanilla sauce.",
        descriptionDe: "Warmer Strudel, Rosinen, Zimt, Vanillesoße.",
        price: 7.5,
        preparationTime: 10,
        allergens: ["gluten", "eggs", "milk", "nuts"],
        isVegetarian: true,
        isFeatured: true,
        calories: 520,
      },
      {
        name: "Kaiserschmarrn",
        nameDe: "Kaiserschmarrn",
        description: "Torn pancake, icing sugar, plum compote. Takes 20 minutes, worth it.",
        descriptionDe: "Zerrissener Pfannkuchen, Puderzucker, Zwetschgenröster. Dauert 20 Minuten, lohnt sich.",
        price: 9.5,
        preparationTime: 20,
        allergens: ["gluten", "eggs", "milk"],
        isVegetarian: true,
        calories: 680,
      },
      {
        name: "Vegan Chocolate Mousse",
        nameDe: "Veganes Schokoladenmousse",
        description: "Dark chocolate, aquafaba, sea salt, hazelnut crumb.",
        descriptionDe: "Zartbitterschokolade, Aquafaba, Meersalz, Haselnusscrumble.",
        price: 6.9,
        preparationTime: 5,
        allergens: ["nuts", "soy"],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 340,
      },
    ],
  },
  {
    category: "Drinks",
    categoryDe: "Getränke",
    description: "Beer, wine and the non-alcoholic list",
    descriptionDe: "Bier, Wein und Alkoholfreies",
    items: [
      {
        name: "Weissbier 0.5l",
        nameDe: "Weißbier 0,5 l",
        description: "Unfiltered wheat beer, brewed 40km from here.",
        descriptionDe: "Naturtrübes Weizenbier, 40 km von hier gebraut.",
        price: 5.2,
        preparationTime: 2,
        allergens: ["gluten"],
        isVegan: true,
        isVegetarian: true,
        calories: 210,
      },
      {
        name: "Pilsner 0.3l",
        nameDe: "Pils 0,3 l",
        description: "Crisp, dry, cold.",
        descriptionDe: "Herb, trocken, kalt.",
        price: 3.9,
        preparationTime: 2,
        allergens: ["gluten"],
        isVegan: true,
        isVegetarian: true,
        calories: 120,
      },
      {
        name: "Riesling 0.2l",
        nameDe: "Riesling 0,2 l",
        description: "Dry Mosel riesling, stone fruit and slate.",
        descriptionDe: "Trockener Mosel-Riesling, Steinobst und Schiefer.",
        price: 6.5,
        preparationTime: 2,
        allergens: ["sulphites"],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 160,
      },
      {
        name: "Apfelschorle",
        nameDe: "Apfelschorle",
        description: "Cloudy apple juice and sparkling water.",
        descriptionDe: "Naturtrüber Apfelsaft mit Sprudelwasser.",
        price: 3.5,
        preparationTime: 2,
        allergens: [],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 90,
      },
      {
        name: "Coffee",
        nameDe: "Kaffee",
        description: "House espresso blend, however you take it.",
        descriptionDe: "Hauseigene Espressomischung, ganz nach Wunsch.",
        price: 3.2,
        preparationTime: 3,
        allergens: [],
        isVegan: true,
        isVegetarian: true,
        isGlutenFree: true,
        calories: 5,
      },
    ],
  },
];

const REVIEW_SEEDS = [
  { rating: 5, title: "Best schnitzel outside Vienna", comment: "The Wiener was enormous and genuinely crisp all the way to the edge. Service was quick even on a full Friday." },
  { rating: 5, title: "Our new Sunday spot", comment: "Booked a table for six, everything arrived together and hot. The Kaiserschmarrn is worth the twenty-minute wait." },
  { rating: 4, title: "Great food, busy room", comment: "Food was excellent. It gets loud after 8pm, so book early if you want to hear each other." },
  { rating: 5, title: "The vegan schnitzel is not an afterthought", comment: "I expected a token option and got something I'd order again over the pork. Celeriac was properly seasoned." },
  { rating: 4, title: "Delivery arrived hot", comment: "Twenty-five minutes door to door and the breading hadn't gone soft. Impressive packaging." },
  { rating: 5, title: "Käsespätzle done right", comment: "Proper mountain cheese, real crispy onions, no shortcuts. Portion is generous." },
  { rating: 3, title: "Good but slow that night", comment: "Food was solid when it came, but we waited about 40 minutes. They did take the drinks off the bill." },
  { rating: 5, title: "Took my parents, they loved it", comment: "Sauerbraten reminded my father of his grandmother's. That's the highest praise he gives." },
];

async function main() {
  console.log("Seeding Schnitzy Haus…");

  // --- restaurant ----------------------------------------------------------
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: SLUG },
    update: {},
    create: {
      slug: SLUG,
      name: "Schnitzy Haus",
      description:
        "A neighbourhood schnitzel house. Everything hand-breaded in the morning, fried when you order it, served with the sides it deserves.",
      email: "hallo@schnitzyhaus.de",
      phone: "+49 30 12345678",
      whatsappNumber: "+49 30 12345678",
      address: "Kastanienallee 47",
      city: "Berlin",
      postalCode: "10119",
      country: "DE",
      latitude: 52.5378,
      longitude: 13.4108,
      openingHours: OPENING_HOURS,
      cuisineType: "German",
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
    { email: "admin@schnitzyhaus.de", firstName: "Marta", lastName: "Keller", role: "ADMIN" as const, phone: "+49 30 11111111" },
    { email: "kitchen@schnitzyhaus.de", firstName: "Jonas", lastName: "Brandt", role: "KITCHEN" as const, phone: "+49 30 22222222" },
    { email: "staff@schnitzyhaus.de", firstName: "Aylin", lastName: "Demir", role: "STAFF" as const, phone: "+49 30 33333333" },
    { email: "driver@schnitzyhaus.de", firstName: "Tomas", lastName: "Novak", role: "DELIVERY" as const, phone: "+49 30 44444444" },
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
    { email: "sam@example.com", firstName: "Sam", lastName: "Okafor", phone: "+49 170 2223334", locale: "en" as const },
    { email: "mira@example.com", firstName: "Mira", lastName: "Bauer", phone: "+49 170 3334445", locale: "de" as const },
    { email: "james@example.com", firstName: "James", lastName: "Whitfield", phone: "+49 170 4445556", locale: "en" as const },
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
      line1: "Schönhauser Allee 128",
      city: "Berlin",
      postalCode: "10437",
      country: "DE",
      latitude: 52.5488,
      longitude: 13.4132,
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
            deliveryAddress: orderType === "DELIVERY" ? "Schönhauser Allee 128" : null,
            deliveryCity: orderType === "DELIVERY" ? "Berlin" : null,
            deliveryPostalCode: orderType === "DELIVERY" ? "10437" : null,
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
