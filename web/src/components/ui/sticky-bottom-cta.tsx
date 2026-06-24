import { forwardRef } from "react";
import { safeBottomCta } from "@/lib/safe-area";
import { screenGutterX } from "@/lib/screen-gutter";
import { cn } from "@/lib/utils";

/** Full-height screen — locks layout so only the body region scrolls. */
export const screenShellClass =
  "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden";

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
      data-app-scroll-y
      className={cn(
        "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y",
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
  variant = "bar",
  scrollFade = false,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "bar" | "floating" | "bare";
  /** Soft gradient above floating CTAs — dims scroll content under the button. */
  scrollFade?: boolean;
}) {
  const isFloating = variant === "floating";
  const isBare = variant === "bare";
  const showScrollFade = isFloating && scrollFade;

  return (
    <>
      {showScrollFade ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[6.75rem]",
            "bg-gradient-to-t from-background from-[28%] via-background/80 via-[58%] to-transparent",
          )}
        />
      ) : null}
      <div
        className={cn(
          "z-20",
          isFloating
            ? "pointer-events-none absolute inset-x-0 bottom-0 bg-transparent px-4 pb-3 pt-3"
            : isBare
              ? cn(
                  "sticky bottom-0 shrink-0 bg-transparent pt-3",
                  screenGutterX,
                  safeBottomCta,
                )
              : cn(
                  "sticky bottom-0 shrink-0 pt-3",
                  "border-t border-border/50 bg-background/95 backdrop-blur-md",
                  "shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
                  screenGutterX,
                  safeBottomCta,
                ),
          className,
        )}
      >
        <div className={isFloating ? "pointer-events-auto" : undefined}>
          {children}
        </div>
      </div>
    </>
  );
}
