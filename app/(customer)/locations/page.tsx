import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";

import { PageHeader } from "@/components/customer/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { directionsUrl, staticEmbedUrl } from "@/lib/maps";
import { prisma } from "@/lib/db";
import { isOpenAt, type OpeningHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  const tLoc = await getTranslations("locations");
  return { title: t("locations"), description: tLoc("lede") };
}

export default async function LocationsPage() {
  const t = await getTranslations("locations");
  const tNav = await getTranslations("nav");
  const tLocation = await getTranslations("location");
  const tFooter = await getTranslations("footer");

  // Multi-tenant-ready: every active restaurant renders as its own card, so
  // opening a second branch needs no code change here.
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow={tFooter("contact")} title={tNav("locations")} lede={t("lede")} />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6">
        {restaurants.map((restaurant) => {
          const hours = (restaurant.openingHours ?? {}) as OpeningHours;
          const isOpen = isOpenAt(hours);
          const fullAddress = `${restaurant.name}, ${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
          const mapUrl = staticEmbedUrl(fullAddress);

          return (
            <Card key={restaurant.id} className="overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {mapUrl ? (
                  <iframe
                    title={`${t("mapOf")} ${restaurant.name}`}
                    src={mapUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    className="aspect-[16/10] w-full border-0 lg:aspect-auto lg:h-full"
                  />
                ) : (
                  <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-cream-200 px-6 text-center lg:aspect-auto">
                    <MapPin className="size-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      {t("mapUnavailable")}
                    </p>
                  </div>
                )}

                <CardContent className="space-y-4 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl">{restaurant.name}</h2>
                    <Badge variant={isOpen ? "success" : "neutral"}>
                      {isOpen ? tLocation("openingHours") : "—"}
                    </Badge>
                  </div>

                  <address className="space-y-2 text-sm not-italic text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        {restaurant.address}
                        <br />
                        {restaurant.postalCode} {restaurant.city}
                      </span>
                    </p>
                    <a
                      href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2 transition-colors hover:text-primary"
                    >
                      <Phone className="size-4 shrink-0 text-primary" aria-hidden />
                      {restaurant.phone}
                    </a>
                    <p className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0 text-primary" aria-hidden />
                      {tFooter("daysRange")}, {tFooter("hoursRange")}
                    </p>
                  </address>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button asChild className="uppercase">
                      <a
                        href={directionsUrl(
                          restaurant.latitude && restaurant.longitude
                            ? { lat: restaurant.latitude, lng: restaurant.longitude }
                            : fullAddress,
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Navigation aria-hidden />
                        {tLocation("getDirections")}
                      </a>
                    </Button>
                    <Button variant="outline" asChild className="uppercase">
                      <Link href="/menu">{tNav("orderNow")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}

        {restaurants.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">{t("none")}</p>
        )}

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <h2 className="font-display text-2xl">{t("comingSoonTitle")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("comingSoonBody")}
            </p>
            <Button variant="outline" asChild className="uppercase">
              <Link href="/contact">{tNav("contact")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
