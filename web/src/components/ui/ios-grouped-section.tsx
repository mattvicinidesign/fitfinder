import { cn } from "@/lib/utils";

/** iOS inset grouped section (Settings-style). */
export function IosGroupedSection({
  title,
  footer,
  children,
  className,
  /** When true, card spans the content width (no mx-4); row px-4 aligns with screen px-4 CTAs. */
  fullWidth = false,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <h2 className="px-4 text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-muted/40 divide-y divide-border/80",
          fullWidth ? "mx-0" : "mx-4",
        )}
      >
        {children}
      </div>
      {footer ? (
        <p className="px-4 text-[13px] text-muted-foreground leading-snug">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

export function IosGroupedRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-background px-4 py-3", className)}>{children}</div>
  );
}
