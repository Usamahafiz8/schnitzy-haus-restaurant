import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold">{t("resetTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("resetSubtitle")}</p>

        <ForgotPasswordForm />

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
