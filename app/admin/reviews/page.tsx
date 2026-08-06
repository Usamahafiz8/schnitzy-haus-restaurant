import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ReviewsModeration } from "@/components/admin/reviews-moderation";
import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default async function AdminReviewsPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tReviews = await getTranslations("reviews");
  const restaurant = await requireRestaurant();

  const [reviews, counts, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.review.groupBy({
      by: ["status"],
      where: { restaurantId: restaurant.id },
      _count: true,
    }),
    prisma.review.aggregate({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("reviews")}</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          label={t("averageRating")}
          value={Math.round((aggregate._avg.rating ?? 0) * 10) / 10 || "—"}
          hint={tReviews("reviewCount", { count: aggregate._count })}
          accent
        />
        <StatCard label={tReviews("pendingApproval")} value={byStatus.PENDING ?? 0} />
        <StatCard label={t("approve")} value={byStatus.APPROVED ?? 0} />
        <StatCard label={t("reject")} value={byStatus.REJECTED ?? 0} />
      </div>

      <ReviewsModeration reviews={serialize(reviews)} locale={locale} />
    </div>
  );
}
