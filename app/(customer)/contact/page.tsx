import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { ContactForm } from "@/components/customer/contact-form";
import { PageHeader } from "@/components/customer/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getRestaurant } from "@/lib/restaurant";
import { isOpenAt, WEEKDAYS, type OpeningHours } from "@/lib/utils";
import { whatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("location");
  return { title: t("contactUs") };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations("location");
  const tContact = await getTranslations("contact");
  const tFooter = await getTranslations("footer");
  const restaurant = await getRestaurant();

  if (!restaurant) return null;

  const hours = (restaurant.openingHours ?? {}) as OpeningHours;
  const isOpen = isOpenAt(hours);
  const todayKey = WEEKDAYS[new Date().getDay()];
  const orderedDays = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

  return (
    <>
      <PageHeader
        eyebrow={tFooter("contact")}
        title={t("contactUs")}
        lede={tContact("lede")}
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        {/* ------------------------------------------------------- details */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-lg tracking-wide">
                {tFooter("contact")}
              </h2>

              <address className="space-y-3 text-sm not-italic text-muted-foreground">
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {restaurant.name}
                    </span>
                    {restaurant.address}
                    <br />
                    {restaurant.postalCode} {restaurant.city}
                  </span>
                </p>

                <a
                  href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden />
                  {restaurant.phone}
                </a>

                <a
                  href={`mailto:${restaurant.email}`}
                  className="flex items-center gap-3 break-all transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                  {restaurant.email}
                </a>

                {restaurant.whatsappNumber && (
                  <a
                    href={whatsAppLink(
                      restaurant.whatsappNumber,
                      locale === "de"
                        ? "Hallo Schnitzy Haus, ich habe eine Frage:"
                        : "Hi Schnitzy Haus, I have a question:",
                    )}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-3 transition-colors hover:text-primary"
                  >
                    <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden />
                    {t("whatsapp")}
                  </a>
                )}
              </address>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
                <Clock className="size-4 text-primary" aria-hidden />
                {t("openingHours")}
              </h2>

              <p
                className={
                  isOpen
                    ? "mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                    : "mt-2 text-sm text-muted-foreground"
                }
              >
                {isOpen ? tContact("openNow") : tContact("closedNow")}
              </p>

              <dl className="mt-4 space-y-1 text-sm">
                {orderedDays.map((day) => {
                  const entry = hours[day];
                  const isToday = day === todayKey;

                  return (
                    <div
                      key={day}
                      className={
                        isToday
                          ? "flex justify-between rounded-md bg-cream-200 px-2 py-1.5 font-semibold"
                          : "flex justify-between px-2 py-1.5"
                      }
                    >
                      <dt>{t(`days.${day}`)}</dt>
                      <dd className="tabular-nums text-muted-foreground">
                        {!entry || entry.closed ? "—" : `${entry.open} – ${entry.close}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------------------- form */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-wide">
              {tContact("formTitle")}
            </h2>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              {tContact("formBody")}
            </p>
            <ContactForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
