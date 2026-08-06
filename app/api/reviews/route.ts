import type { Prisma } from "@prisma/client";

import {
  badRequest,
  conflict,
  created,
  currentUser,
  handler,
  ok,
  paginate,
  paginated,
  parseBody,
  requireUser,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRestaurantId } from "@/lib/restaurant";
import { createReviewSchema } from "@/lib/validations";

const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  images: true,
  status: true,
  adminResponse: true,
  respondedAt: true,
  createdAt: true,
  customer: { select: { firstName: true, lastName: true, image: true } },
} satisfies Prisma.ReviewSelect;

/**
 * Public listing shows approved reviews only. `mine=true` returns the caller's
 * own reviews including those still awaiting moderation.
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const restaurantId = await getRestaurantId();
  const user = await currentUser();

  const mine = url.searchParams.get("mine") === "true";
  const rating = url.searchParams.get("rating");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 10));

  if (mine && !user) return ok(paginated([], 0, page, pageSize));

  const where: Prisma.ReviewWhereInput = {
    restaurantId,
    ...(mine ? { customerId: user!.id } : { status: "APPROVED" }),
    ...(rating ? { rating: Number(rating) } : {}),
  };

  const [items, total, aggregate, distribution] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(page, pageSize),
      select: PUBLIC_REVIEW_SELECT,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where: { restaurantId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { restaurantId, status: "APPROVED" },
      _count: true,
    }),
  ]);

  return ok({
    ...paginated(items, total, page, pageSize),
    summary: {
      average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      count: aggregate._count,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        rating: star,
        count: distribution.find((d) => d.rating === star)?._count ?? 0,
      })),
    },
  });
});

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "review", RATE_LIMITS.review.limit, RATE_LIMITS.review.windowMs);

  const user = await requireUser();
  const input = await parseBody(req, createReviewSchema);
  const restaurantId = await getRestaurantId();

  // A review tied to an order proves the person actually ate here.
  if (input.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { customerId: true, status: true, review: { select: { id: true } } },
    });

    if (!order || order.customerId !== user.id) {
      throw badRequest("You can only review your own orders");
    }
    if (order.status !== "DELIVERED") {
      throw badRequest("You can review an order once it's complete");
    }
    if (order.review) {
      throw conflict("You've already reviewed this order");
    }
  }

  const review = await prisma.review.create({
    data: {
      restaurantId,
      orderId: input.orderId ?? null,
      customerId: user.id,
      rating: input.rating,
      title: input.title || null,
      comment: input.comment || null,
      images: input.images,
      status: "PENDING",
    },
    select: PUBLIC_REVIEW_SELECT,
  });

  return created(review);
});
