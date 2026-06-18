import { safeTopTitle } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

/** iOS-style large navigation title (canonical header on every screen). */
export function IosLargeTitle({
  title,
  subtitle,
  trailing,
  /** When false, omit top safe-area padding (parent header already applied it). */
  insetTop = true,
  className,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  insetTop?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 bg-background px-4 pb-3",
        insetTop && safeTopTitle,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-[34px] font-bold leading-tight tracking-tight">
          {title}
        </h1>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {subtitle ? (
        <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
