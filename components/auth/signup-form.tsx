"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, apiFieldErrors, postJson } from "@/lib/api-client";

export function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const locale = useLocale();

  const raw = params.get("callbackUrl") ?? "/";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      await postJson("/auth/register", { ...form, locale });

      // Sign straight in — making someone type their password twice in a row
      // is the fastest way to lose them at the door.
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/auth/login");
        return;
      }

      toast.success("Welcome to Schnitzy Haus", {
        description: "You've got 100 welcome points to spend.",
      });
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
      setPending(false);
    }
  };

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")} htmlFor="firstName" required error={errors.firstName}>
          <Input
            value={form.firstName}
            onChange={set("firstName")}
            autoComplete="given-name"
            autoFocus
            required
          />
        </Field>

        <Field label={t("lastName")} htmlFor="lastName" required error={errors.lastName}>
          <Input
            value={form.lastName}
            onChange={set("lastName")}
            autoComplete="family-name"
            required
          />
        </Field>
      </div>

      <Field label={t("email")} htmlFor="email" required error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>

      <Field label={t("phone")} htmlFor="phone" error={errors.phone}>
        <Input
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>

      <Field
        label={t("password")}
        htmlFor="password"
        required
        error={errors.password}
        hint="At least 8 characters, with a letter and a number"
      >
        <Input
          type="password"
          value={form.password}
          onChange={set("password")}
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        label={t("confirmPassword")}
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword}
      >
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          autoComplete="new-password"
          required
        />
      </Field>

      <Button type="submit" block size="lg" loading={pending}>
        {t("signUp")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
