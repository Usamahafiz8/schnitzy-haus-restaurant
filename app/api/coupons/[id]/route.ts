import {
  conflict,
  handler,
  logActivity,
  noContent,
  notFound,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { couponBaseSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

const patchSchema = couponBaseSchema.partial();

export const PUT = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, patchSchema);

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw notFound("Coupon not found");

  if (input.code && input.code !== existing.code) {
    const clash = await prisma.coupon.findUnique({
      where: { code: input.code },
      select: { id: true },
    });
    if (clash) throw conflict("A coupon with that code already exists");
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
      ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
      ...(input.minOrderAmount !== undefined
        ? { minOrderAmount: input.minOrderAmount ?? null }
        : {}),
      ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount ?? null } : {}),
      ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit ?? null } : {}),
      ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit ?? null } : {}),
      ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
      ...(input.validTo !== undefined ? { validTo: input.validTo } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await logActivity(staff.id, "coupon.update", "Coupon", id, { code: coupon.code });

  return ok(coupon);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    select: { id: true, code: true, _count: { select: { redemptions: true } } },
  });
  if (!coupon) throw notFound("Coupon not found");

  // Redeemed coupons are deactivated rather than deleted so order history keeps
  // its link to how the discount was earned.
  if (coupon._count.redemptions > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await logActivity(staff.id, "coupon.deactivate", "Coupon", id, { code: coupon.code });
    return ok({
      deactivated: true,
      reason: "This coupon has been redeemed, so it was deactivated instead of deleted.",
    });
  }

  await prisma.coupon.delete({ where: { id } });
  await logActivity(staff.id, "coupon.delete", "Coupon", id, { code: coupon.code });

  return noContent();
});
