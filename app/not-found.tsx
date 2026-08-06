import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <UtensilsCrossed className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="mt-6 text-3xl font-bold">404</h1>
      <p className="mt-2 text-lg font-medium">{t("notFound")}</p>
      <p className="mt-1 max-w-sm text-muted-foreground">{t("notFoundBody")}</p>

      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">{t("goHome")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/menu">Menu</Link>
        </Button>
      </div>
    </div>
  );
}
