/** iOS-style large navigation title (canonical header on every screen). */
export function IosLargeTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="shrink-0 bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
