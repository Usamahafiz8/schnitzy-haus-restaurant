import type {
  BookingStatus,
  DiscountType,
  LoyaltyTier,
  NotificationType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  Role,
} from "@prisma/client";

export type {
  BookingStatus,
  DiscountType,
  LoyaltyTier,
  NotificationType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  Role,
};

export type AppLocale = "en" | "de";

export const LOCALES: AppLocale[] = ["de", "en"];
// The restaurant is in Frankfurt and the brand voice is German — an English
// speaker switching once is a better default than a German one having to.
export const DEFAULT_LOCALE: AppLocale = "de";

/** Roles allowed into /admin. */
export const STAFF_ROLES: Role[] = ["ADMIN", "STAFF", "KITCHEN", "DELIVERY"];

export type ApiSuccess<T> = { data: T };
export type ApiError = {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** A line in the client-side cart (persisted in localStorage by Zustand). */
export type CartLine = {
  itemId: string;
  name: string;
  nameDe?: string | null;
  price: number;
  image?: string | null;
  quantity: number;
  specialNotes?: string;
  preparationTime?: number;
};

export type PricedOrder = {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  couponCode: string | null;
};

export type OpeningHoursMap = Record<
  string,
  { open: string; close: string; closed?: boolean }
>;

export type DashboardStats = {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  upcomingBookings: number;
  averageOrderValue: number;
  averageRating: number;
  reviewCount: number;
  newCustomers: number;
  revenueChangePct: number;
  ordersChangePct: number;
};

export type SalesPoint = { date: string; revenue: number; orders: number };
export type TopItem = {
  menuItemId: string | null;
  name: string;
  quantity: number;
  revenue: number;
};
export type TopCustomer = {
  customerId: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
};
export type HourBucket = { hour: number; orders: number; revenue: number };

export type TimeSlot = {
  time: string;
  available: boolean;
  remainingSeats: number;
};
