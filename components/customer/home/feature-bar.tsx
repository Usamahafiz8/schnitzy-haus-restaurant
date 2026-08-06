import { getTranslations } from "next-intl/server";
import { Beef, Bike, Flame, Star } from "lucide-react";

const FEATURES = [
  { key: "quality", icon: Beef },
  { key: "fresh", icon: Flame },
  { key: "delivery", icon: Bike },
  { key: "rated", icon: Star },
] as const;

/** The four-promise strip that sits between the hero and the menu. */
export async function FeatureBar() {
  const t = await getTranslations("home.features");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <ul className="grid divide-y divide-border rounded-2xl border border-border bg-card sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <li
              key={feature.key}
              className={[
                "flex items-start gap-4 p-5",
                // Vertical rules between columns, but never a trailing one.
                index > 0 ? "sm:border-l sm:border-border" : "",
                index === 2 ? "lg:border-l" : "sm:border-l",
              ].join(" ")}
            >
              <Icon className="size-7 shrink-0 text-primary" strokeWidth={1.6} aria-hidden />
              <div>
                <h3 className="font-display text-sm tracking-wide text-foreground">
                  {t(`${feature.key}.title`)}
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  {t(`${feature.key}.body`)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
