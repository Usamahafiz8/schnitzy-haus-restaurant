import {
  badRequest,
  conflict,
  created,
  forbidden,
  handler,
  notFound,
  parseBody,
  requireUser,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createReviewSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, { params }: Params) => {
  await enforceRateLimit(req, "review", RATE_LIMITS.review.limit, RATE_LIMITS.review.windowMs);

  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(req, createReviewSchema);

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      restaurantId: true,
      status: true,
      review: { select: { id: true } },
    },
  });

  if (!order) throw notFound("We couldn't find that order");
  if (order.customerId !== user.id) {
    throw forbidden("You can only review your own orders");
  }
  if (order.status !== "DELIVERED") {
    throw badRequest("You can review an order once it's complete");
  }
  if (order.review) {
    throw conflict("You've already reviewed this order");
  }

  const review = await prisma.review.create({
    data: {
      restaurantId: order.restaurantId,
      orderId: order.id,
      customerId: user.id,
      rating: input.rating,
      title: input.title || null,
      comment: input.comment || null,
      images: input.images,
      status: "PENDING",
    },
  });

  return created(review);
});
