"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, apiFieldErrors, postJson } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await postJson("/auth/forgot-password", { email });
      // The endpoint always reports success — never reveal whether the address
      // exists. The UI mirrors that.
      setSent(true);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/40">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <p className="text-sm">{t("resetSent")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
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

      <Button type="submit" block size="lg" loading={pending}>
        {t("resetSubmit")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      await postJson("/auth/reset-password", { token, password, confirmPassword });
      toast.success(t("passwordUpdated"));
      router.push("/auth/login");
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
      setPending(false);
    }
  };

  if (!token) {
    return (
      <p role="alert" className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {t("linkExpired")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field
        label={t("password")}
        htmlFor="password"
        required
        error={errors.password}
        hint="At least 8 characters, with a letter and a number"
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
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
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      <Button type="submit" block size="lg" loading={pending}>
        {t("newPasswordSubmit")}
      </Button>
    </form>
  );
}
