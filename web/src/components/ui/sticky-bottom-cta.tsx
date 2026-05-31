import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Full-height screen — locks layout so only the body region scrolls. */
export const screenShellClass =
  "relative flex h-full min-h-0 flex-col overflow-hidden";

export function StickyScreenHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 shrink-0 bg-background",
        className,
      )}
    >
      {children}
    </header>
  );
}

export const StickyScreenBody = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
  }
>(function StickyScreenBody({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
    >
      {children}
    </div>
  );
});

/** Primary action bar — pinned to the bottom of the screen shell. */
export function StickyBottomCta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 shrink-0",
        "border-t border-border/50 bg-background/95 backdrop-blur-md",
        "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
