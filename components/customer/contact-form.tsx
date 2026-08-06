"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { apiErrorMessage, apiFieldErrors, postJson } from "@/lib/api-client";

export function ContactForm() {
  const t = useTranslations("location");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill once the session resolves, without clobbering anything typed.
  const name =
    form.name ||
    (session?.user
      ? `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim()
      : "");
  const email = form.email || session?.user?.email || "";

  const submit = async () => {
    setSending(true);
    setErrors({});
    try {
      await postJson("/inquiries", { ...form, name, email });
      setSent(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
        <p className="text-sm">{t("sent")}</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={tCommon("name")} htmlFor="contactName" required error={errors.name}>
        <Input
          value={name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoComplete="name"
          required
        />
      </Field>

      <Field label={tCommon("email")} htmlFor="contactEmail" required error={errors.email}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          required
        />
      </Field>

      <Field label={tCommon("phone")} htmlFor="contactPhone" error={errors.phone}>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          autoComplete="tel"
        />
      </Field>

      <Field label={t("subject")} htmlFor="contactSubject" required error={errors.subject}>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
          maxLength={140}
        />
      </Field>

      <Field
        label={t("message")}
        htmlFor="contactMessage"
        required
        error={errors.message}
        className="sm:col-span-2"
      >
        <Textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          maxLength={2000}
        />
      </Field>

      <div className="sm:col-span-2">
        <Button type="submit" loading={sending}>
          <Send aria-hidden />
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
