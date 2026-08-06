import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid("Invalid identifier");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255)
  .transform((v) => v.toLowerCase());

/** At least 8 chars with a letter and a number — enforced identically on both sides. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{6,20}$/, "Enter a valid phone number");

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const localeSchema = z.enum(["en", "de"]);

export const moneySchema = z.coerce
  .number()
  .nonnegative("Must be zero or more")
  .max(100000);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
    locale: localeSchema.default("en"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  phone: phoneSchema.optional().or(z.literal("")),
  locale: localeSchema.optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifyMarketing: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  line1: z.string().trim().min(1, "Street address is required").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(80),
  postalCode: z.string().trim().min(3, "Postal code is required").max(12),
  country: z.string().trim().length(2).default("DE"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  nameDe: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  descriptionDe: z.string().trim().max(500).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const menuItemBaseSchema = z.object({
    categoryId: uuidSchema,
    name: z.string().trim().min(1, "Name is required").max(120),
    nameDe: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    descriptionDe: z.string().trim().max(1000).optional().or(z.literal("")),
    price: moneySchema.refine((v) => v > 0, "Price must be greater than zero"),
    discountPrice: moneySchema.optional().nullable(),
    image: z.string().url().optional().or(z.literal("")),
    preparationTime: z.coerce.number().int().min(1).max(240).default(15),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isAvailable: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    isVegan: z.boolean().default(false),
    isVegetarian: z.boolean().default(false),
    isGlutenFree: z.boolean().default(false),
    isSpicy: z.boolean().default(false),
    calories: z.coerce.number().int().min(0).max(10000).optional().nullable(),
    allergens: z.array(z.string().trim().max(40)).max(20).default([]),
});

export const menuItemSchema = menuItemBaseSchema
  .refine(
    (d) =>
      d.discountPrice === null ||
      d.discountPrice === undefined ||
      d.discountPrice < d.price,
    { message: "Discount price must be below the regular price", path: ["discountPrice"] },
  );

export const menuQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  categoryId: uuidSchema.optional(),
  vegan: z.coerce.boolean().optional(),
  vegetarian: z.coerce.boolean().optional(),
  glutenFree: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(["popular", "price_asc", "price_desc", "name"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const cartLineSchema = z.object({
  itemId: uuidSchema,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(50),
  specialNotes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const createOrderSchema = z
  .object({
    items: z.array(cartLineSchema).min(1, "Your cart is empty").max(60),
    orderType: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]),
    paymentMethod: z.enum(["STRIPE", "CASH"]).default("STRIPE"),
    couponCode: z.string().trim().max(40).optional().or(z.literal("")),
    pointsToRedeem: z.coerce.number().int().min(0).max(1_000_000).default(0),
    tipAmount: moneySchema.default(0),
    customerName: z.string().trim().min(1, "Name is required").max(120),
    customerEmail: emailSchema,
    customerPhone: phoneSchema,
    deliveryAddress: z.string().trim().max(200).optional().or(z.literal("")),
    deliveryPostalCode: z.string().trim().max(12).optional().or(z.literal("")),
    deliveryCity: z.string().trim().max(80).optional().or(z.literal("")),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    specialNotes: z.string().trim().max(500).optional().or(z.literal("")),
    scheduledFor: z.coerce.date().optional(),
  })
  .refine(
    (d) =>
      d.orderType !== "DELIVERY" ||
      (!!d.deliveryAddress && !!d.deliveryPostalCode && !!d.deliveryCity),
    {
      message: "A delivery address, city and postal code are required",
      path: ["deliveryAddress"],
    },
  );

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(300).optional(),
  estimatedMinutes: z.coerce.number().int().min(0).max(600).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  refund: z.boolean().default(true),
});

export const orderQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
  orderType: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]).optional(),
  paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  q: z.string().trim().max(80).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  numberOfGuests: z.coerce.number().int().min(1, "At least one guest").max(50),
  bookingDate: dateKeySchema,
  bookingTime: timeSchema,
  customerName: z.string().trim().min(1, "Name is required").max(120),
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  specialRequests: z.string().trim().max(500).optional().or(z.literal("")),
  occasion: z.string().trim().max(60).optional().or(z.literal("")),
});

export const updateBookingSchema = z.object({
  numberOfGuests: z.coerce.number().int().min(1).max(50).optional(),
  bookingDate: dateKeySchema.optional(),
  bookingTime: timeSchema.optional(),
  specialRequests: z.string().trim().max(500).optional(),
  occasion: z.string().trim().max(60).optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  tableId: uuidSchema.nullable().optional(),
  cancellationReason: z.string().trim().max(300).optional(),
});

export const availabilityQuerySchema = z.object({
  date: dateKeySchema,
  guests: z.coerce.number().int().min(1).max(50).default(2),
});

export const tableSchema = z.object({
  number: z.string().trim().min(1).max(10),
  seats: z.coerce.number().int().min(1).max(30),
  location: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(["FREE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"]).optional(),
  isActive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const createReviewSchema = z.object({
  orderId: uuidSchema.optional(),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  images: z.array(z.string().url()).max(5).default([]),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const reviewResponseSchema = z.object({
  response: z.string().trim().min(1, "Write a response").max(1000),
});

// ---------------------------------------------------------------------------
// Loyalty & coupons
// ---------------------------------------------------------------------------

export const redeemPointsSchema = z.object({
  points: z.coerce.number().int().min(1, "Enter an amount to redeem"),
});

export const adjustPointsSchema = z.object({
  customerId: uuidSchema,
  points: z.coerce.number().int(),
  note: z.string().trim().max(200).optional(),
});

// Base object kept separate from the refined schema so PATCH handlers can
// `.partial()` it — `.refine()` returns a ZodEffects, which has no `.partial()`.
export const couponBaseSchema = z.object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens and underscores")
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().positive("Enter a discount value"),
    minOrderAmount: moneySchema.optional().nullable(),
    maxDiscount: moneySchema.optional().nullable(),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    perUserLimit: z.coerce.number().int().min(1).optional().nullable(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
    isActive: z.boolean().default(true),
});

export const couponSchema = couponBaseSchema
  .refine((d) => d.validTo > d.validFrom, {
    message: "End date must be after the start date",
    path: ["validTo"],
  })
  .refine((d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(40),
  subtotal: moneySchema,
});

// ---------------------------------------------------------------------------
// Notifications, staff, settings, support
// ---------------------------------------------------------------------------

export const pushSubscribeSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["web", "ios", "android"]).default("web"),
  userAgent: z.string().max(300).optional(),
});

export const staffSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  role: z.enum(["ADMIN", "STAFF", "KITCHEN", "DELIVERY"]),
  password: passwordSchema.optional(),
});

export const updateStaffSchema = z.object({
  role: z.enum(["ADMIN", "STAFF", "KITCHEN", "DELIVERY", "CUSTOMER"]).optional(),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  phone: phoneSchema.optional().or(z.literal("")),
  isDeleted: z.boolean().optional(),
});

const dayHoursSchema = z.object({
  open: timeSchema,
  close: timeSchema,
  closed: z.boolean().default(false),
});

export const restaurantSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  whatsappNumber: phoneSchema.optional().or(z.literal("")),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(12).optional(),
  country: z.string().trim().max(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cuisineType: z.string().trim().max(60).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  openingHours: z.record(z.string(), dayHoursSchema).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  dineInEnabled: z.boolean().optional(),
  deliveryFee: moneySchema.optional(),
  freeDeliveryOver: moneySchema.optional().nullable(),
  deliveryRadiusKm: z.coerce.number().min(0).max(100).optional(),
  minOrderAmount: moneySchema.optional(),
  pointsPerCurrency: z.coerce.number().min(0).max(100).optional(),
  pointsPerDiscountUnit: z.coerce.number().int().min(1).max(10000).optional(),
  bookingSlotMinutes: z.coerce.number().int().min(5).max(120).optional(),
  bookingMaxGuests: z.coerce.number().int().min(1).max(100).optional(),
  bookingLeadHours: z.coerce.number().int().min(0).max(72).optional(),
  bookingDurationMins: z.coerce.number().int().min(15).max(360).optional(),
  isActive: z.boolean().optional(),
});

export const inquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  subject: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(2000),
});

export const inquiryResponseSchema = z.object({
  response: z.string().trim().min(1).max(2000),
  channel: z.enum(["EMAIL", "WHATSAPP"]).default("EMAIL"),
});

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
