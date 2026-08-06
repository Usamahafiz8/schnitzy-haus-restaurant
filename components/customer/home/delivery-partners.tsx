import { getTranslations } from "next-intl/server";

import { LieferandoLogo, UberEatsLogo, WoltLogo } from "@/components/shared/partner-logos";

const PARTNERS = [
  { name: "Lieferando", Logo: LieferandoLogo, href: "https://www.lieferando.de" },
  { name: "Uber Eats", Logo: UberEatsLogo, href: "https://www.ubereats.com" },
  { name: "Wolt", Logo: WoltLogo, href: "https://wolt.com" },
] as const;

export async function DeliveryPartners() {
  const t = await getTranslations("home");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-cream-200 px-6 py-7 lg:flex-row lg:justify-between lg:px-10">
        <div className="text-center lg:text-left">
          <p className="eyebrow">{t("partnersEyebrow")}</p>
          <h2 className="mt-1 font-display text-xl sm:text-2xl">
            {t("partnersTitle")}
          </h2>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {PARTNERS.map(({ name, Logo, href }) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${t("orderVia")} ${name}`}
                className="block opacity-90 transition-opacity hover:opacity-100"
              >
                <Logo className="h-6 w-auto sm:h-7" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
