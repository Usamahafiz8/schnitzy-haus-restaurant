import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Play, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden bg-cream-100">
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:py-16">
        <div className="max-w-xl">
          <p className="script text-3xl text-primary sm:text-4xl">
            {t("heroKicker")}
          </p>

          <h1 className="mt-1 font-display text-[clamp(3rem,11vw,5.75rem)] leading-[0.86]">
            {t("heroLine1")}
            <br />
            <span className="text-primary">{t("heroLine2")}</span>
          </h1>

          {/* Rule with three stars, as in the brand lockup. */}
          <div className="mt-6 flex items-center gap-3" aria-hidden>
            <span className="h-0.5 w-16 bg-primary" />
            <span className="flex gap-1 text-primary">
              <Star className="size-3 fill-current" />
              <Star className="size-3 fill-current" />
              <Star className="size-3 fill-current" />
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {t("heroBody")}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Button size="lg" asChild className="uppercase">
              <Link href="/menu">{t("orderNow")}</Link>
            </Button>

            <Link
              href="/about#video"
              className="group inline-flex items-center gap-3 text-[13px] font-bold uppercase tracking-wider text-foreground transition-colors hover:text-primary"
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Play className="size-3.5 fill-current" aria-hidden />
              </span>
              {t("ourVideo")}
            </Link>
          </div>
        </div>

        {/* --------------------------------------------------------- product */}
        <div className="relative flex justify-center lg:justify-end">
          <Image
            src="/images/hero-burger.png"
            alt={t("heroImageAlt")}
            width={617}
            height={494}
            priority
            sizes="(max-width: 1024px) 90vw, 640px"
            className="h-auto w-full max-w-md object-contain drop-shadow-2xl lg:max-w-2xl"
          />
        </div>
      </div>
    </section>
  );
}
