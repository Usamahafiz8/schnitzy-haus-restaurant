import {
  currentUser,
  forbidden,
  handler,
  logActivity,
  noContent,
  notFound,
  ok,
  parseBody,
  requireUser,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { updateReviewSchema } from "@/lib/validations";
import { STAFF_ROLES } from "@/types";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    include: { customer: { select: { firstName: true, lastName: true, image: true } } },
  });

  if (!review) throw notFound("Review not found");

  const user = await currentUser();
  const canSee =
    review.status === "APPROVED" ||
    (user && (review.customerId === user.id || STAFF_ROLES.includes(user.role)));

  if (!canSee) throw notFound("Review not found");

  return ok(review);
});

export const PUT = handler(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(req, updateReviewSchema);

  const review = await prisma.review.findUnique({
    where: { id },
    select: { customerId: true },
  });
  if (!review) throw notFound("Review not found");
  if (review.customerId !== user.id) {
    throw forbidden("You can only edit your own reviews");
  }

  // Editing sends it back through moderation.
  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.title !== undefined ? { title: input.title || null } : {}),
      ...(input.comment !== undefined ? { comment: input.comment || null } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      status: "PENDING",
    },
  });

  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    select: { customerId: true },
  });
  if (!review) throw notFound("Review not found");

  const isStaff = STAFF_ROLES.includes(user.role);
  if (review.customerId !== user.id && !isStaff) {
    throw forbidden("You can only delete your own reviews");
  }

  await prisma.review.delete({ where: { id } });
  await logActivity(user.id, "review.delete", "Review", id);

  return noContent();
});
