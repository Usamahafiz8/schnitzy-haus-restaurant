import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn"), robots: { index: false } };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold">{t("signIn")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signInSubtitle")}</p>

        <Suspense fallback={<Skeleton className="mt-6 h-64 w-full" />}>
          <LoginForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
