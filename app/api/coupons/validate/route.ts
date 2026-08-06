import { badRequest, currentUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { couponDiscountFor } from "@/lib/pricing";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRestaurantId } from "@/lib/restaurant";
import { toNumber } from "@/lib/utils";
import { validateCouponSchema } from "@/lib/validations";

/**
 * Checks a code before checkout so the cart can show the discount. Checkout
 * revalidates from scratch — this is a preview, not an authorisation.
 */
export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "coupon", RATE_LIMITS.coupon.limit, RATE_LIMITS.coupon.windowMs);

  const input = await parseBody(req, validateCouponSchema);
  const user = await currentUser();
  const restaurantId = await getRestaurantId();
  const now = new Date();

  const coupon = await prisma.coupon.findUnique({
    where: { code: input.code.toUpperCase() },
  });

  if (!coupon || coupon.restaurantId !== restaurantId || !coupon.isActive) {
    throw badRequest("That coupon code isn't valid");
  }
  if (coupon.validFrom > now) throw badRequest("That coupon isn't active yet");
  if (coupon.validTo < now) throw badRequest("That coupon has expired");
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw badRequest("That coupon has been fully redeemed");
  }

  if (coupon.minOrderAmount && input.subtotal < toNumber(coupon.minOrderAmount)) {
    throw badRequest(
      `Spend at least ${toNumber(coupon.minOrderAmount).toFixed(2)} to use this coupon`,
    );
  }

  if (user && coupon.perUserLimit !== null) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: user.id },
    });
    if (used >= coupon.perUserLimit) {
      throw badRequest("You've already used that coupon");
    }
  }

  return ok({
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: toNumber(coupon.discountValue),
    discountAmount: couponDiscountFor(coupon, input.subtotal),
  });
});
