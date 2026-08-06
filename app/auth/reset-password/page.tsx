import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/components/auth/password-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("newPasswordTitle"), robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold">{t("newPasswordTitle")}</h1>

        <Suspense fallback={<Skeleton className="mt-6 h-48 w-full" />}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-4 text-center text-sm">
          <Link
            href="/auth/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
