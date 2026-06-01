import { safeTopTitle } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

/** iOS-style large navigation title (canonical header on every screen). */
export function IosLargeTitle({
  title,
  subtitle,
  /** When false, omit top safe-area padding (parent header already applied it). */
  insetTop = true,
  className,
}: {
  title: string;
  subtitle?: string;
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
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
