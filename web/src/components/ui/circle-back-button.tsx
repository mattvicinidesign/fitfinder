"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Circular back control — Tailwind + `.circle-back-btn` in globals.css
 * (utilities for web; explicit CSS for iOS WKWebView button reset).
 */
export const circleBackButtonClass = cn(
  "circle-back-btn",
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
  "border-2 border-border bg-secondary text-primary",
  "transition-colors hover:bg-muted active:bg-muted/80",
  "[appearance:none] [-webkit-appearance:none]",
);

const iconClass = "size-5 shrink-0 pointer-events-none";

export function CircleBackButton({
  className,
  "aria-label": ariaLabel = "Go back",
  ...props
}: Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(circleBackButtonClass, className)}
      {...props}
    >
      <ChevronLeft className={iconClass} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

export function CircleBackLink({
  className,
  "aria-label": ariaLabel = "Go back",
  ...props
}: Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(circleBackButtonClass, className)}
      {...props}
    >
      <ChevronLeft className={iconClass} strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
