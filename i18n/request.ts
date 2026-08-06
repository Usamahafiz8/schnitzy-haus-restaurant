import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALES, type AppLocale } from "@/types";

export const LOCALE_COOKIE = "schnitzy_locale";

/**
 * i18n without locale-prefixed URLs: the route table in the spec is
 * `/menu`, `/admin/dashboard` etc., so the locale lives in a cookie and the
 * same URL serves both languages. Switching writes the cookie and refreshes.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get(LOCALE_COOKIE)?.value as AppLocale | undefined;
  const locale: AppLocale =
    requested && LOCALES.includes(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: process.env.RESTAURANT_TIMEZONE ?? "Europe/Berlin",
    now: new Date(),
  };
});
