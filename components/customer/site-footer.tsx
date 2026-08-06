import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Logo } from "@/components/shared/logo";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/shared/social-icons";

const SOCIALS = [
  { name: "Instagram", href: "https://instagram.com/schnitzyhaus", Icon: InstagramIcon },
  { name: "Facebook", href: "https://facebook.com/schnitzyhaus", Icon: FacebookIcon },
  { name: "TikTok", href: "https://tiktok.com/@schnitzyhaus", Icon: TikTokIcon },
] as const;

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
  };
}) {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  const quickLinks = [
    { href: "/", label: tNav("home") },
    { href: "/menu", label: tNav("menu") },
    { href: "/about", label: tNav("about") },
    { href: "/locations", label: tNav("locations") },
    { href: "/contact", label: tNav("contact") },
  ];

  // Germany requires an Impressum and these consumer-law pages on any
  // commercial site — they are not optional decoration.
  const legalLinks = [
    { href: "/impressum", label: t("imprint") },
    { href: "/datenschutz", label: t("privacy") },
    { href: "/agb", label: t("terms") },
    { href: "/widerrufsrecht", label: t("withdrawal") },
    { href: "/lieferung-zahlung", label: t("shipping") },
  ];

  return (
    <footer className="mt-4 border-t border-border bg-cream-200 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr_1fr]">
        {/* ------------------------------------------------------------ brand */}
        <div>
          <Logo />

          <ul className="mt-5 flex gap-3">
            {SOCIALS.map(({ name, href, Icon }) => (
              <li key={name}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${t("followUs")} — ${name}`}
                  className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------- quick links */}
        <nav aria-labelledby="footer-quick">
          <h2 id="footer-quick" className="font-display text-xs tracking-widest">
            {t("quickLinks")}
          </h2>
          <ul className="mt-4 space-y-2 text-[13px]">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ---------------------------------------------------------- legal */}
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="font-display text-xs tracking-widest">
            {t("information")}
          </h2>
          <ul className="mt-4 space-y-2 text-[13px]">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* --------------------------------------------------------- contact */}
        <div>
          <h2 className="font-display text-xs tracking-widest">{t("contact")}</h2>
          <address className="mt-4 space-y-2 text-[13px] not-italic text-muted-foreground">
            <p className="font-semibold text-foreground">{restaurant.name}</p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {restaurant.address}
                <br />
                {restaurant.postalCode} {restaurant.city}
              </span>
            </p>
            <p>
              <a
                href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 transition-colors hover:text-primary"
              >
                <Phone className="size-3.5 shrink-0" aria-hidden />
                {restaurant.phone}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${restaurant.email}`}
                className="flex items-center gap-2 break-all transition-colors hover:text-primary"
              >
                <Mail className="size-3.5 shrink-0" aria-hidden />
                {restaurant.email}
              </a>
            </p>
          </address>
        </div>

        {/* ------------------------------------------------------------ hours */}
        <div>
          <h2 className="font-display text-xs tracking-widest">
            {t("openingHours")}
          </h2>
          <p className="mt-4 text-[13px] text-muted-foreground">
            {t("daysRange")}
            <br />
            {t("hoursRange")}
          </p>

          <p className="script mt-5 text-lg leading-tight text-primary">
            {t("signOff")}{" "}
            <span aria-hidden className="text-primary/70">
              ♡
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {restaurant.name}. {t("rights")}
          </p>

          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
