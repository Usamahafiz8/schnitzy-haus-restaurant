import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Beef, Flame, HandHeart, Leaf } from "lucide-react";

import { PageHeader } from "@/components/customer/page-header";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("aboutTitle"), description: t("aboutBody") };
}

const VALUES = [
  { key: "quality", icon: Beef },
  { key: "handmade", icon: HandHeart },
  { key: "fresh", icon: Leaf },
  { key: "flavour", icon: Flame },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("home");
  const tAbout = await getTranslations("about");

  return (
    <>
      <PageHeader
        eyebrow={t("aboutEyebrow")}
        title={t("aboutTitle")}
        lede={t("aboutBody")}
      />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="overflow-hidden rounded-2xl">
            <Image
              src="/images/interior.jpg"
              alt={t("aboutImageAlt")}
              width={1200}
              height={800}
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h2 className="font-display text-3xl">{tAbout("storyTitle")}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              {tAbout("storyBody1")}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {tAbout("storyBody2")}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t("aboutBody2")}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- values */}
      <section className="border-y border-border bg-cream-200">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl">{tAbout("valuesTitle")}</h2>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-8 text-primary" strokeWidth={1.6} aria-hidden />
                <h3 className="mt-4 font-display text-base tracking-wide">
                  {tAbout(`values.${key}.title`)}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {tAbout(`values.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- video */}
      <section id="video" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6">
        <h2 className="font-display text-3xl">{tAbout("videoTitle")}</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">
          {tAbout("videoBody")}
        </p>

        {/*
          The brand video isn't shot yet. Rather than embed a placeholder that
          looks broken, this states the fact — drop an <iframe> or <video> here
          when the footage exists.
        */}
        <div className="mt-6 flex aspect-video w-full max-w-3xl items-center justify-center rounded-2xl border border-dashed border-border bg-cream-200 text-center">
          <p className="max-w-xs px-6 text-sm text-muted-foreground">
            {tAbout("videoPlaceholder")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="font-display text-3xl sm:text-4xl">{tAbout("ctaTitle")}</h2>
          <p className="max-w-md text-[15px] text-primary-foreground/85">
            {tAbout("ctaBody")}
          </p>
          <Button size="lg" variant="secondary" asChild className="uppercase">
            <Link href="/menu">{t("orderNow")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
