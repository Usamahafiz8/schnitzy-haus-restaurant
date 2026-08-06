import { handler, notFound, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { captureMessage } from "@/lib/monitoring";

type Params = { params: Promise<{ id: string }> };

const AUTO_HIDE_THRESHOLD = 3;

/** Community reporting. Enough reports pull the review back into moderation. */
export const POST = handler(async (_req: Request, { params }: Params) => {
  await requireUser();
  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, reportCount: true },
  });
  if (!review) throw notFound("Review not found");

  const nextCount = review.reportCount + 1;

  await prisma.review.update({
    where: { id },
    data: {
      reportCount: nextCount,
      ...(nextCount >= AUTO_HIDE_THRESHOLD ? { status: "PENDING" } : {}),
    },
  });

  if (nextCount >= AUTO_HIDE_THRESHOLD) {
    captureMessage("Review auto-hidden after reports", { reviewId: id, reports: nextCount });
  }

  return ok({ reported: true });
});
