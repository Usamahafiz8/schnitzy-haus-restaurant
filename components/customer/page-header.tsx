/** Shared banner for the secondary pages: eyebrow, title, optional lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="border-b border-border bg-cream-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-4xl sm:text-5xl">{title}</h1>
        {lede && (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {lede}
          </p>
        )}
      </div>
    </header>
  );
}
