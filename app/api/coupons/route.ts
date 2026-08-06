import {
  conflict,
  created,
  handler,
  logActivity,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { couponSchema } from "@/lib/validations";

/**
 * Coupons a customer can actually use right now: active, in date, and not
 * exhausted. Never exposes usage internals.
 */
export const GET = handler(async () => {
  const restaurantId = await getRestaurantId();
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    where: {
      restaurantId,
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
    orderBy: { validTo: "asc" },
    select: {
      id: true,
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      minOrderAmount: true,
      maxDiscount: true,
      validTo: true,
      usageLimit: true,
      usageCount: true,
    },
  });

  const available = coupons
    .filter((c) => c.usageLimit === null || c.usageCount < c.usageLimit)
    .map(({ usageLimit: _limit, usageCount: _count, ...rest }) => rest);

  return ok(available);
});

export const POST = handler(async (req: Request) => {
  const staff = await requireStaff();
  const input = await parseBody(req, couponSchema);
  const restaurantId = await getRestaurantId();

  const existing = await prisma.coupon.findUnique({
    where: { code: input.code },
    select: { id: true },
  });
  if (existing) throw conflict("A coupon with that code already exists");

  const coupon = await prisma.coupon.create({
    data: {
      restaurantId,
      code: input.code,
      description: input.description || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? null,
      maxDiscount: input.maxDiscount ?? null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      validFrom: input.validFrom,
      validTo: input.validTo,
      isActive: input.isActive,
    },
  });

  await logActivity(staff.id, "coupon.create", "Coupon", coupon.id, { code: coupon.code });

  return created(coupon);
});
