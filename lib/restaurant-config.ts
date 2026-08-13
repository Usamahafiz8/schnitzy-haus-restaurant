import type { OpeningHours } from "@/lib/utils";

/**
 * The restaurant's profile ships with the code, not the database — one
 * location, rarely changes, no admin form needed. Edit this file and
 * redeploy to change the name, address, hours, fees, tax rate, or loyalty
 * rates.
 *
 * The one thing that *is* still live is `Restaurant.isActive` in the
 * database (see lib/restaurant.ts) — a "stop accepting orders right now"
 * switch staff can flip from /admin/settings without a deploy, for a
 * kitchen emergency or an unexpected closure.
 */
export type RestaurantConfig = {
  slug: string;
  name: string;
  description: string | null;
  email: string;
  phone: string;
  whatsappNumber: string | null;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  cuisineType: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  openingHours: OpeningHours;
  currency: string;
  taxRate: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number | null;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  pointsPerCurrency: number;
  pointsPerDiscountUnit: number;
  tierThresholds: { SILVER: number; GOLD: number; PLATINUM: number };
  bookingSlotMinutes: number;
  bookingMaxGuests: number;
  bookingLeadHours: number;
  bookingDurationMins: number;
};

const OPEN_ALL_WEEK = { open: "11:00", close: "23:00", closed: false };

export const RESTAURANT_CONFIG: RestaurantConfig = {
  slug: "schnitzy-haus",
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
  cuisineType: "Burgers & Bowls",
  logoUrl: null,
  bannerUrl: null,
  openingHours: {
    monday: OPEN_ALL_WEEK,
    tuesday: OPEN_ALL_WEEK,
    wednesday: OPEN_ALL_WEEK,
    thursday: OPEN_ALL_WEEK,
    friday: OPEN_ALL_WEEK,
    saturday: OPEN_ALL_WEEK,
    sunday: OPEN_ALL_WEEK,
  },
  currency: "EUR",
  taxRate: 19,
  deliveryEnabled: true,
  pickupEnabled: true,
  dineInEnabled: true,
  deliveryFee: 3.5,
  freeDeliveryOver: 45,
  deliveryRadiusKm: 8,
  minOrderAmount: 15,
  pointsPerCurrency: 1,
  pointsPerDiscountUnit: 100,
  tierThresholds: { SILVER: 250, GOLD: 1000, PLATINUM: 2500 },
  bookingSlotMinutes: 30,
  bookingMaxGuests: 12,
  bookingLeadHours: 1,
  bookingDurationMins: 90,
};

/** The subset lib/pricing.ts needs — plain numbers, not the database's Decimal. */
export type RestaurantPricingConfig = Pick<
  RestaurantConfig,
  | "taxRate"
  | "deliveryFee"
  | "freeDeliveryOver"
  | "minOrderAmount"
  | "pointsPerCurrency"
  | "pointsPerDiscountUnit"
>;
