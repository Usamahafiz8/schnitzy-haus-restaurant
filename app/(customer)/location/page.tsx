import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, MessageCircle, Navigation, Phone } from "lucide-react";

import { ContactForm } from "@/components/customer/contact-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { directionsUrl, staticEmbedUrl } from "@/lib/maps";
import { getRestaurant } from "@/lib/restaurant";
import { isOpenAt, WEEKDAYS, type OpeningHours } from "@/lib/utils";
import { whatsAppLink } from "@/lib/whatsapp";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("location");
  const restaurant = await getRestaurant();
  return {
    title: t("title"),
    description: restaurant
      ? `${restaurant.name}, ${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`
      : undefined,
  };
}

export default async function LocationPage() {
  const locale = await getLocale();
  const t = await getTranslations("location");
  const tHome = await getTranslations("home");
  const restaurant = await getRestaurant();

  if (!restaurant) return null;

  const hours = (restaurant.openingHours ?? {}) as OpeningHours;
  const isOpen = isOpenAt(hours);
  const fullAddress = `${restaurant.name}, ${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
  const mapUrl = staticEmbedUrl(fullAddress);
  const todayKey = WEEKDAYS[new Date().getDay()];

  // Monday-first, which is how German opening-hours signs read.
  const orderedDays = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </header>

      {/* ------------------------------------------------------------------ map */}
      <Card className="overflow-hidden">
        {mapUrl ? (
          <iframe
            title={`Map showing ${restaurant.name}`}
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="aspect-[16/10] w-full border-0 sm:aspect-[21/9]"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 bg-muted text-center sm:aspect-[21/9]">
            <MapPin className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Set <code className="rounded bg-background px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
              <br />
              to show the interactive map.
            </p>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* -------------------------------------------------------- address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden />
              {t("address")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <address className="not-italic text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{restaurant.name}</p>
              <p>{restaurant.address}</p>
              <p>
                {restaurant.postalCode} {restaurant.city}
              </p>
            </address>

            <div className="flex flex-col gap-2">
              <Button asChild>
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
                  {t("getDirections")}
                </a>
              </Button>

              <Button variant="outline" asChild>
                <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
                  <Phone aria-hidden />
                  {t("callRestaurant")}
                </a>
              </Button>

              {restaurant.whatsappNumber && (
                <Button variant="outline" asChild>
                  <a
                    href={whatsAppLink(
                      restaurant.whatsappNumber,
                      locale === "de"
                        ? "Hallo Schnitzy Haus, ich habe eine Frage:"
                        : "Hi Schnitzy Haus, I have a question:",
                    )}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <MessageCircle aria-hidden />
                    {t("whatsapp")}
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------- hours */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("openingHours")}</CardTitle>
            <Badge variant={isOpen ? "success" : "neutral"}>
              {isOpen ? tHome("openingHours") : "—"}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {orderedDays.map((day) => {
                const entry = hours[day];
                const isToday = day === todayKey;

                return (
                  <div
                    key={day}
                    className={
                      isToday
                        ? "flex justify-between rounded-md bg-muted px-2 py-1.5 font-medium"
                        : "flex justify-between px-2 py-1.5"
                    }
                  >
                    <dt>{t(`days.${day}`)}</dt>
                    <dd className="tabular-nums text-muted-foreground">
                      {!entry || entry.closed
                        ? "—"
                        : `${entry.open} – ${entry.close}`}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------- contact */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("contactUs")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
