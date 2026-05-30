import { cn } from "@/lib/utils";

/** iOS inset grouped section (Settings-style). */
export function IosGroupedSection({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <h2 className="px-4 text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div className="mx-4 overflow-hidden rounded-xl bg-muted/40 divide-y divide-border/80">
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
