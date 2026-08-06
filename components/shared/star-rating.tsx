"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          width={size}
          height={size}
          aria-hidden
          className={
            star <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/35"
          }
        />
      ))}
    </div>
  );
}

export function StarInput({
  value,
  onChange,
  size = 32,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  label: string;
}) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">{label}</legend>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition-transform hover:scale-110"
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          aria-pressed={value === star}
        >
          <Star
            width={size}
            height={size}
            className={
              star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
            }
          />
        </button>
      ))}
    </fieldset>
  );
}
