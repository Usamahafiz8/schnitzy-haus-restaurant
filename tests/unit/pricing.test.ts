import { Prisma, type Coupon, type Restaurant } from "@prisma/client";

import { couponDiscountFor, effectivePrice, priceOrder, PricingError } from "@/lib/pricing";
import type { MenuItemData } from "@/lib/menu-data";

const decimal = (value: number) => new Prisma.Decimal(value);

function makeItem(overrides: Partial<MenuItemData> = {}): MenuItemData {
  return {
    id: "item-1",
    categoryId: "c1",
    name: "Wiener Schnitzel",
    nameDe: "Wiener Schnitzel",
    description: "",
    descriptionDe: "",
    price: 20,
    discountPrice: null,
    image: "/images/dishes/wiener-schnitzel.jpg",
    preparationTime: 20,
    displayOrder: 0,
    isAvailable: true,
    isFeatured: false,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    calories: null,
    allergens: [],
    ...overrides,
  };
}

const restaurant = {
  taxRate: decimal(19),
  deliveryFee: decimal(3.5),
  freeDeliveryOver: decimal(45),
  minOrderAmount: decimal(15),
  pointsPerCurrency: decimal(1),
  pointsPerDiscountUnit: 100,
} as unknown as Pick<
  Restaurant,
  | "taxRate"
  | "deliveryFee"
  | "freeDeliveryOver"
  | "minOrderAmount"
  | "pointsPerCurrency"
  | "pointsPerDiscountUnit"
>;

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    restaurantId: "r1",
    code: "TEST10",
    description: null,
    discountType: "PERCENTAGE",
    discountValue: decimal(10),
    minOrderAmount: null,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 86400_000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon;
}

describe("effectivePrice", () => {
  it("uses the discount when it beats the base price", () => {
    expect(effectivePrice(makeItem({ discountPrice: 15 }))).toBe(15);
  });

  it("ignores a discount that isn't actually cheaper", () => {
    expect(effectivePrice(makeItem({ discountPrice: 25 }))).toBe(20);
  });

  it("ignores a zero discount price", () => {
    expect(effectivePrice(makeItem({ discountPrice: 0 }))).toBe(20);
  });
});

describe("couponDiscountFor", () => {
  it("applies a percentage", () => {
    expect(couponDiscountFor(makeCoupon(), 50)).toBe(5);
  });

  it("respects the cap", () => {
    expect(
      couponDiscountFor(makeCoupon({ maxDiscount: decimal(3) }), 100),
    ).toBe(3);
  });

  it("applies a fixed amount", () => {
    expect(
      couponDiscountFor(
        makeCoupon({ discountType: "FIXED_AMOUNT", discountValue: decimal(7) }),
        50,
      ),
    ).toBe(7);
  });

  it("never discounts more than the order is worth", () => {
    expect(
      couponDiscountFor(
        makeCoupon({ discountType: "FIXED_AMOUNT", discountValue: decimal(100) }),
        20,
      ),
    ).toBe(20);
  });
});

describe("priceOrder", () => {
  const menuItems = [makeItem()];
  const lines = [{ itemId: "item-1", quantity: 2 }];

  it("computes a pickup total with VAT extracted from the price", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "PICKUP",
    });

    expect(result.subtotal).toBe(40);
    expect(result.deliveryFee).toBe(0);
    expect(result.totalAmount).toBe(40);
    // 19% VAT included: 40 - 40/1.19
    expect(result.tax).toBeCloseTo(6.39, 2);
  });

  it("charges delivery below the free-delivery threshold", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "DELIVERY",
    });

    expect(result.deliveryFee).toBe(3.5);
    expect(result.totalAmount).toBe(43.5);
  });

  it("waives delivery above the threshold", () => {
    const result = priceOrder({
      lines: [{ itemId: "item-1", quantity: 3 }],
      menuItems,
      restaurant,
      orderType: "DELIVERY",
    });

    expect(result.subtotal).toBe(60);
    expect(result.deliveryFee).toBe(0);
  });

  it("rejects a delivery order below the minimum", () => {
    expect(() =>
      priceOrder({
        lines: [{ itemId: "item-1", quantity: 1 }],
        menuItems: [makeItem({ price: 10 })],
        restaurant,
        orderType: "DELIVERY",
      }),
    ).toThrow(PricingError);
  });

  it("rejects an unavailable item", () => {
    expect(() =>
      priceOrder({
        lines,
        menuItems: [makeItem({ isAvailable: false })],
        restaurant,
        orderType: "PICKUP",
      }),
    ).toThrow(/unavailable/i);
  });

  it("caps redeemed points at the available balance", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "PICKUP",
      pointsToRedeem: 5000,
      availablePoints: 500,
    });

    // 500 points at 100 points per unit = €5.
    expect(result.pointsDiscount).toBe(5);
    expect(result.pointsRedeemed).toBe(500);
    expect(result.totalAmount).toBe(35);
  });

  it("never lets points push the total below zero", () => {
    const result = priceOrder({
      lines: [{ itemId: "item-1", quantity: 1 }],
      menuItems: [makeItem({ price: 10 })],
      restaurant,
      orderType: "PICKUP",
      pointsToRedeem: 100_000,
      availablePoints: 100_000,
    });

    expect(result.totalAmount).toBe(0);
    expect(result.pointsDiscount).toBe(10);
  });

  it("applies a coupon before points", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "PICKUP",
      coupon: makeCoupon(),
      pointsToRedeem: 100_000,
      availablePoints: 100_000,
    });

    expect(result.couponDiscount).toBe(4);
    expect(result.pointsDiscount).toBe(36);
    expect(result.totalAmount).toBe(0);
  });

  it("earns points on the discounted amount, not the list price", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "PICKUP",
      coupon: makeCoupon(),
    });

    expect(result.pointsEarned).toBe(36);
  });

  it("adds a tip on top without taxing it", () => {
    const result = priceOrder({
      lines,
      menuItems,
      restaurant,
      orderType: "PICKUP",
      tipAmount: 5,
    });

    expect(result.totalAmount).toBe(45);
    expect(result.tax).toBeCloseTo(6.39, 2);
  });

  it("throws when an item isn't on the menu at all", () => {
    expect(() =>
      priceOrder({
        lines: [{ itemId: "ghost", quantity: 1 }],
        menuItems,
        restaurant,
        orderType: "PICKUP",
      }),
    ).toThrow(PricingError);
  });
});
