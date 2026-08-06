import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Menu photography is the restaurant's to supply. Until an image is uploaded we
 * render a deterministic warm gradient keyed off the dish name, so the grid
 * still reads as designed rather than showing broken-image icons.
 */
const GRADIENTS = [
  "from-amber-200 to-orange-300 dark:from-amber-900 dark:to-orange-950",
  "from-orange-200 to-red-200 dark:from-orange-950 dark:to-red-950",
  "from-yellow-200 to-amber-300 dark:from-yellow-900 dark:to-amber-950",
  "from-lime-200 to-emerald-200 dark:from-lime-950 dark:to-emerald-950",
  "from-rose-200 to-amber-200 dark:from-rose-950 dark:to-amber-950",
  "from-stone-200 to-amber-200 dark:from-stone-800 dark:to-amber-950",
];

function hash(text: string) {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

export function DishImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 320px",
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const gradient = GRADIENTS[hash(alt) % GRADIENTS.length];
  const initial = alt.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br",
        gradient,
        className,
      )}
      role="img"
      aria-label={alt}
    >
      <span className="select-none text-3xl font-semibold text-black/25 dark:text-white/25">
        {initial}
      </span>
    </div>
  );
}
