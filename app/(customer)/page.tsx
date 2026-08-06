import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ChefHat, Clock, MapPin, ShoppingBag, Sparkles } from "lucide-react";

import { MenuItemCard } from "@/components/customer/menu-item-card";
import { StarRating } from "@/components/shared/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { isOpenAt, type OpeningHours } from "@/lib/utils";

// The menu changes rarely; a one-minute window keeps the landing page instant
// without serving genuinely stale prices.
export const revalidate = 60;

export default async function HomePage() {
  const restaurant = await getRestaurant();
  const locale = await getLocale();
  const t = await getTranslations("home");
  const tMenu = await getTranslations("menu");
  const tReviews = await getTranslations("reviews");

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ChefHat className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">No restaurant configured</h1>
        <p className="mt-2 text-muted-foreground">
          Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> to
          create the Schnitzy Haus demo data.
        </p>
      </div>
    );
  }

  const [featured, categories, reviews, ratingAgg] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isFeatured: true, isAvailable: true },
      take: 6,
      orderBy: { displayOrder: "asc" },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    prisma.review.findMany({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    prisma.review.aggregate({
      where: { restaurantId: restaurant.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const isOpen = isOpenAt(restaurant.openingHours as OpeningHours);
  const average = Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10;

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-50 to-background dark:from-brand-900/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <Badge variant="default" className="mb-4">
              <Sparkles aria-hidden />
              {restaurant.cuisineType} · {restaurant.city}
            </Badge>

            <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/menu">
                  <ShoppingBag aria-hidden />
                  {t("orderNow")}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/bookings">{t("bookTable")}</Link>
              </Button>
            </div>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" aria-hidden />
                <dt className="sr-only">Status</dt>
                <dd className={isOpen ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                  {isOpen ? "Open now" : "Currently closed"}
                </dd>
              </div>
              {ratingAgg._count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating value={average} size={14} />
                  <dd className="text-muted-foreground">
                    {tReviews("averageRating", { rating: average })} ·{" "}
                    {tReviews("reviewCount", { count: ratingAgg._count })}
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden />
                <dd className="text-muted-foreground">
                  {restaurant.address}, {restaurant.city}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{t("featured")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("featuredSubtitle")}
              </p>
            </div>
            <Button variant="ghost" asChild className="shrink-0">
              <Link href="/menu">
                {tMenu("title")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item, index) => (
              <MenuItemCard
                key={item.id}
                item={serialize(item)}
                locale={locale}
                currency={restaurant.currency}
                priority={index < 3}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- categories */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-semibold">{t("categoriesTitle")}</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/menu?category=${category.id}`}
                className="group flex items-center justify-between rounded-[--radius-card] border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div>
                  <p className="font-medium">
                    {locale === "de" && category.nameDe ? category.nameDe : category.name}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {tMenu("itemCount", { count: category._count.items })}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- how it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("howItWorks")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, title: t("step1"), body: t("step1Body") },
            { n: 2, title: t("step2"), body: t("step2Body") },
            { n: 3, title: t("step3"), body: t("step3Body") },
          ].map((step) => (
            <li key={step.n}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------------- reviews */}
      {reviews.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold">{t("reviewsTitle")}</h2>
              <Button variant="ghost" asChild className="shrink-0">
                <Link href="/reviews">
                  {tReviews("title")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="space-y-3 p-5">
                    <StarRating value={review.rating} />
                    {review.title && <p className="font-medium">{review.title}</p>}
                    {review.comment && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
