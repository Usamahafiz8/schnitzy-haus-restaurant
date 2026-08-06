"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Globe } from "lucide-react";

import { apiErrorMessage, postJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Locale lives in a cookie rather than the URL, so switching means writing the
 * cookie and then re-rendering everything the server produced.
 *
 * This reloads rather than calling `router.refresh()`. A soft refresh re-fetches
 * the RSC payload but leaves the `<html lang>` attribute on the previous
 * language, which is what assistive technology reads to pick a voice — so a
 * screen-reader user would hear German read with an English pronunciation. A
 * full reload is a one-off cost on a rare action and gets the whole document
 * right, including metadata.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  const switchTo = async (next: "en" | "de") => {
    if (next === locale || pending) return;

    setPending(true);
    try {
      await postJson("/locale", { locale: next });
      window.location.reload();
    } catch (error) {
      setPending(false);
      console.error(apiErrorMessage(error));
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border p-0.5 text-xs",
        pending && "opacity-60",
        className,
      )}
    >
      <Globe className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {(["en", "de"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => void switchTo(option)}
          disabled={pending}
          aria-current={option === locale}
          className={cn(
            "rounded-full px-2 py-1 font-medium uppercase transition-colors",
            option === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
