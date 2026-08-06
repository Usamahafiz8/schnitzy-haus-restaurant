import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChefHat, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { whatsAppLink } from "@/lib/whatsapp";

export async function SiteFooter({
  restaurant,
}: {
  restaurant: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    email: string;
    whatsappNumber: string | null;
  };
}) {
  const t = await getTranslations("nav");
  const tHome = await getTranslations("home");

  return (
    <footer className="mt-16 border-t border-border bg-muted/40 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <ChefHat className="size-5 text-primary" aria-hidden />
            {restaurant.name}
          </div>
          <p className="text-sm text-muted-foreground">
            Hand-breaded daily, fried to order, served with everything it deserves.
          </p>
        </div>

        <nav className="space-y-2 text-sm" aria-label="Footer">
          <p className="font-medium">{t("menu")}</p>
          <Link href="/menu" className="block text-muted-foreground hover:text-foreground">
            {t("menu")}
          </Link>
          <Link href="/bookings" className="block text-muted-foreground hover:text-foreground">
            {t("bookings")}
          </Link>
          <Link href="/loyalty" className="block text-muted-foreground hover:text-foreground">
            {t("loyalty")}
          </Link>
          <Link href="/orders" className="block text-muted-foreground hover:text-foreground">
            {t("orders")}
          </Link>
        </nav>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{tHome("visitUs")}</p>
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {restaurant.address}
              <br />
              {restaurant.postalCode} {restaurant.city}
            </span>
          </p>
          <Link
            href="/location"
            className="inline-block text-primary underline-offset-4 hover:underline"
          >
            {tHome("getDirections")}
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{tHome("callUs")}</p>
          <a
            href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-4" aria-hidden />
            {restaurant.phone}
          </a>
          <a
            href={`mailto:${restaurant.email}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Mail className="size-4" aria-hidden />
            {restaurant.email}
          </a>
          {restaurant.whatsappNumber && (
            <a
              href={whatsAppLink(restaurant.whatsappNumber)}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="size-4" aria-hidden />
              {tHome("whatsappUs")}
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {restaurant.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
