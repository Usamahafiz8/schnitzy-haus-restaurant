import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";

import { ReviewForm } from "@/components/customer/review-form";
import { StarRating } from "@/components/shared/star-rating";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reviews");
  return { title: t("title") };
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("reviews");
  const restaurant = await getRestaurant();
  const user = await currentUser();

  if (!restaurant) return null;

  const [reviews, aggregate, distribution, reviewableOrder] = await Promise.all([
    prisma.review.findMany({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    prisma.review.aggregate({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      _count: true,
    }),
    // Only offer the form when there's a completed, un-reviewed order to attach.
    orderId && user
      ? prisma.order.findFirst({
          where: {
            id: orderId,
            customerId: user.id,
            status: "DELIVERED",
            review: null,
          },
          select: { id: true, orderNumber: true },
        })
      : null,
  ]);

  const average = Math.round((aggregate._avg.rating ?? 0) * 10) / 10;
  const total = aggregate._count;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>

      {reviewableOrder && (
        <Card className="mb-6 border-primary/40">
          <CardContent className="p-5">
            <h2 className="mb-1 font-semibold">{t("leaveReview")}</h2>
            <p className="mb-4 font-mono text-xs text-muted-foreground">
              {reviewableOrder.orderNumber}
            </p>
            <ReviewForm orderId={reviewableOrder.id} />
          </CardContent>
        </Card>
      )}

      {orderId && !reviewableOrder && user && (
        <p className="mb-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t("alreadyReviewed")}
        </p>
      )}

      {/* ------------------------------------------------------------- summary */}
      {total > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
            <div className="text-center sm:w-32">
              <p className="text-4xl font-bold">{average}</p>
              <StarRating value={average} className="mt-1 justify-center" />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("reviewCount", { count: total })}
              </p>
            </div>

            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution.find((d) => d.rating === star)?._count ?? 0;
                const percent = total === 0 ? 0 : Math.round((count / total) * 100);

                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --------------------------------------------------------------- list */}
      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t("empty")} body={t("emptyBody")} />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card>
                <CardContent className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={review.rating} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt, locale)}
                    </span>
                  </div>

                  {review.title && <p className="font-medium">{review.title}</p>}
                  {review.comment && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                  </p>

                  {review.adminResponse && (
                    <div className="mt-3 rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-2">
                      <p className="flex items-center gap-2 text-xs font-medium">
                        <Badge variant="default">{t("restaurantReplied")}</Badge>
                      </p>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {review.adminResponse}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
