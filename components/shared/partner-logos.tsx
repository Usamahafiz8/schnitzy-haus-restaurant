/**
 * Wordmarks for the delivery partners, drawn as text-in-SVG in each brand's
 * own colour so they scale cleanly and need no image assets.
 *
 * These are third-party trademarks. Before going live, replace them with the
 * official assets from each partner's brand-guidelines page and check you're
 * entitled to display them — most partner programmes require it, but the
 * permitted lockups and clear-space rules are theirs to define, not ours.
 */
type LogoProps = { className?: string };

export function LieferandoLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 150 34" className={className} role="img" aria-label="Lieferando">
      {/* The orange "house with cutlery" mark. */}
      <path
        d="M15.5 3 4 12.4V31h23V12.4L15.5 3Z"
        fill="#FF8000"
      />
      <path
        d="M11.4 14.5v6.2m0 0v9m0-9c-1.5 0-2.6-1-2.6-2.4v-3.8M19.6 14.5c-1.7 0-2.7 1.5-2.7 3.4 0 1.6.9 2.7 2.2 2.9v9"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="34"
        y="25"
        fill="#FF8000"
        fontFamily="var(--font-sans)"
        fontSize="21"
        fontWeight="700"
        letterSpacing="-0.4"
      >
        Lieferando
      </text>
    </svg>
  );
}

export function UberEatsLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 132 30" className={className} role="img" aria-label="Uber Eats">
      <text
        x="0"
        y="23"
        fill="currentColor"
        fontFamily="var(--font-sans)"
        fontSize="24"
        fontWeight="700"
        letterSpacing="-0.6"
        className="text-foreground"
      >
        Uber
      </text>
      <text
        x="59"
        y="23"
        fill="#06C167"
        fontFamily="var(--font-sans)"
        fontSize="24"
        fontWeight="700"
        letterSpacing="-0.6"
      >
        Eats
      </text>
    </svg>
  );
}

export function WoltLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 84 30" className={className} role="img" aria-label="Wolt">
      <text
        x="0"
        y="23"
        fill="#00C2E8"
        fontFamily="var(--font-sans)"
        fontSize="25"
        fontWeight="700"
        fontStyle="italic"
        letterSpacing="-0.8"
      >
        Wolt
      </text>
    </svg>
  );
}
