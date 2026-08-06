import { cookies } from "next/headers";

import { currentUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE } from "@/i18n/request";
import { localeSchema } from "@/lib/validations";
import { z } from "zod";

const schema = z.object({ locale: localeSchema });

/**
 * Switches language. The cookie is what `i18n/request.ts` reads on every
 * request; signed-in users also get it saved so it follows them across devices.
 */
export const POST = handler(async (req: Request) => {
  const { locale } = await parseBody(req, schema);

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    httpOnly: false,
  });

  const user = await currentUser();
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  }

  return ok({ locale });
});
