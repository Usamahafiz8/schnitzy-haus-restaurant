import { cn } from "@/lib/utils";

/**
 * The house mark: a pitched roof over a burger stack, drawn rather than
 * imported so it stays crisp at every size and recolours with the brand token.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 40"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {/* roof */}
      <path
        d="M24 2.5 3.5 16.5v2.2h41v-2.2L24 2.5Z"
        fill="currentColor"
      />
      {/* chimney */}
      <rect x="34" y="7" width="4.4" height="5.2" rx="1" fill="currentColor" />
      {/* burger stack inside the house body */}
      <path
        d="M11 22.5h26a0 0 0 0 1 0 0v1.6a3.4 3.4 0 0 1-3.4 3.4H14.4a3.4 3.4 0 0 1-3.4-3.4v-1.6Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M11.6 29.2h24.8a1.6 1.6 0 0 1 0 3.2H11.6a1.6 1.6 0 0 1 0-3.2Z"
        fill="currentColor"
      />
      <path
        d="M13 34.6h22a2.6 2.6 0 0 1 2.6 2.6v.3H10.4v-.3A2.6 2.6 0 0 1 13 34.6Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Full lockup: mark, wordmark, rule and tagline. `compact` drops the tagline
 * for tight spots like the mobile header.
 */
export function Logo({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <LogoMark
        className={cn("h-6 w-auto", inverted ? "text-white" : "text-primary")}
      />

      <span
        className={cn(
          "mt-1 font-display text-xl tracking-tight",
          inverted ? "text-white" : "text-foreground",
        )}
      >
        SCHNITZY{" "}
        <span className={inverted ? "text-brand-300" : "text-primary"}>HAUS</span>
      </span>

      {!compact && (
        <span
          className={cn(
            "mt-1 flex w-full items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.14em]",
            inverted ? "text-white/70" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "h-px flex-1",
              inverted ? "bg-white/30" : "bg-border",
            )}
          />
          Premium Burgers &amp; Bowls
          <span
            className={cn(
              "h-px flex-1",
              inverted ? "bg-white/30" : "bg-border",
            )}
          />
        </span>
      )}
    </span>
  );
}
