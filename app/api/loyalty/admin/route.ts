import {
  badRequest,
  handler,
  logActivity,
  ok,
  paginate,
  paginated,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseThresholds, recordPoints } from "@/lib/loyalty";
import { notifyUser } from "@/lib/notifications";
import { requireRestaurant } from "@/lib/restaurant";
import { adjustPointsSchema } from "@/lib/validations";

/** Loyalty member list for the admin screen. */
export const GET = handler(async (req: Request) => {
  await requireStaff();
  const url = new URL(req.url);
  const restaurant = await requireRestaurant();

  const tier = url.searchParams.get("tier");
  const q = url.searchParams.get("q");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));

  const where = {
    restaurantId: restaurant.id,
    ...(tier ? { tier: tier as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" } : {}),
    ...(q
      ? {
          customer: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [items, total, byTier, aggregate] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where,
      orderBy: { totalSpent: "desc" },
      ...paginate(page, pageSize),
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.loyaltyAccount.count({ where }),
    prisma.loyaltyAccount.groupBy({
      by: ["tier"],
      where: { restaurantId: restaurant.id },
      _count: true,
    }),
    prisma.loyaltyAccount.aggregate({
      where: { restaurantId: restaurant.id },
      _sum: { points: true, totalSpent: true },
      _avg: { totalSpent: true },
    }),
  ]);

  return ok({
    ...paginated(items, total, page, pageSize),
    stats: {
      byTier: Object.fromEntries(byTier.map((t) => [t.tier, t._count])),
      outstandingPoints: aggregate._sum.points ?? 0,
      totalSpent: aggregate._sum.totalSpent ?? 0,
      averageSpend: aggregate._avg.totalSpent ?? 0,
      thresholds: parseThresholds(restaurant.tierThresholds),
      pointsPerDiscountUnit: restaurant.pointsPerDiscountUnit,
    },
  });
});

/** Manual points adjustment — goodwill gestures, corrections, comped meals. */
export const POST = handler(async (req: Request) => {
  const staff = await requireStaff();
  const input = await parseBody(req, adjustPointsSchema);
  const restaurant = await requireRestaurant();

  if (input.points === 0) throw badRequest("Enter a non-zero adjustment");

  const customer = await prisma.user.findUnique({
    where: { id: input.customerId },
    select: { id: true, firstName: true },
  });
  if (!customer) throw badRequest("That customer doesn't exist");

  const { account } = await prisma.$transaction((tx) =>
    recordPoints(tx, {
      restaurantId: restaurant.id,
      customerId: input.customerId,
      points: input.points,
      reason: "MANUAL_ADJUSTMENT",
      note: input.note ?? `Adjusted by ${staff.firstName} ${staff.lastName}`.trim(),
      thresholds: parseThresholds(restaurant.tierThresholds),
    }),
  );

  await notifyUser({
    userId: input.customerId,
    type: "LOYALTY",
    title: input.points > 0 ? "Points added" : "Points adjusted",
    message: `${input.points > 0 ? "+" : ""}${input.points} points. New balance: ${account.points}.`,
    link: "/loyalty",
    channels: { email: false },
  });

  await logActivity(staff.id, "loyalty.adjust", "LoyaltyAccount", account.id, {
    customerId: input.customerId,
    points: input.points,
  });

  return ok(account);
});
