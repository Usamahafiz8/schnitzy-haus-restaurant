import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function AboutSection() {
  const t = await getTranslations("home");

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="max-w-md">
          <p className="eyebrow">{t("aboutEyebrow")}</p>
          <h2 className="mt-1.5 font-display text-3xl sm:text-4xl">
            {t("aboutTitle")}
          </h2>

          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            {t("aboutBody")}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("aboutBody2")}
          </p>

          <Button variant="outline" asChild className="mt-7 uppercase">
            <Link href="/about">{t("learnMore")}</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <Image
            src="/images/interior.jpg"
            alt={t("aboutImageAlt")}
            width={1200}
            height={800}
            sizes="(max-width: 1024px) 100vw, 620px"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
