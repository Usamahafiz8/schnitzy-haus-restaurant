import { z } from "zod";

import { handler, logActivity, notFound, ok, parseBody, requireStaff } from "@/lib/api";
import { prisma } from "@/lib/db";
import { reviewResponseSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

const moderateSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

/** Approve or reject a pending review. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const { action } = await parseBody(req, moderateSchema);

  const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Review not found");

  const review = await prisma.review.update({
    where: { id },
    data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
  });

  await logActivity(staff.id, `review.${action}`, "Review", id);

  return ok(review);
});

/** Publish the restaurant's reply under a review. */
export const PUT = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const { response } = await parseBody(req, reviewResponseSchema);

  const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Review not found");

  const review = await prisma.review.update({
    where: { id },
    data: { adminResponse: response, respondedAt: new Date() },
  });

  await logActivity(staff.id, "review.respond", "Review", id);

  return ok(review);
});
