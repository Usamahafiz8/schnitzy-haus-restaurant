import { createHash } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

/**
 * Consumes an email-verification token. Done as a server component rather than
 * an API call so the link works straight from an email client.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  let verified = false;

  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (record && !record.usedAt && record.expiresAt > new Date()) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { emailVerified: new Date() },
        }),
        prisma.emailVerificationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]);
      verified = true;
    }
  }

  return (
    <Card>
      <CardContent className="p-6 text-center">
        {verified ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
            <h1 className="mt-4 text-xl font-bold">{t("verified")}</h1>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-10 text-destructive" aria-hidden />
            <h1 className="mt-4 text-xl font-bold">{t("verifyTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("linkExpired")}</p>
          </>
        )}

        <Button asChild block className="mt-6">
          <Link href={verified ? "/" : "/auth/login"}>
            {verified ? "Start ordering" : t("backToSignIn")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
