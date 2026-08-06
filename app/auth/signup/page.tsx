import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUp"), robots: { index: false } };
}

export default async function SignupPage() {
  const t = await getTranslations("auth");

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold">{t("signUp")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signUpSubtitle")}</p>

        <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
          <SignupForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
