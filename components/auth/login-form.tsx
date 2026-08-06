"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/misc";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();

  // Only ever follow same-origin callbacks — an attacker-supplied absolute URL
  // here would turn the login page into an open redirect.
  const raw = params.get("callbackUrl") ?? "/";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("invalidCredentials"));
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("email")} htmlFor="email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
          />
        </Field>

        <Field label={t("password")} htmlFor="password" required error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" block size="lg" loading={pending}>
          {t("signIn")}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase text-muted-foreground">{t("or")}</span>
            <Separator className="flex-1" />
          </div>

          <Button
            variant="outline"
            block
            size="lg"
            onClick={() => signIn("google", { callbackUrl })}
          >
            {t("continueWithGoogle")}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
