"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV } from "@/lib/navigation";
import { triggerNavHaptic } from "@/lib/haptics";
import { NavTab } from "@/components/app-shell/nav-tab";
import { cn } from "@/lib/utils";

const ANALYZE_HREF = "/analyze";

/**
 * Primary navigation everywhere — iOS tab bar pattern with a large, centered,
 * emphasized "Analyze Fit" action raised above the bar.
 */
export function AppTabBar() {
  const pathname = usePathname();
  const sideItems = APP_NAV.filter((item) => item.href !== ANALYZE_HREF);
  const analyze = APP_NAV.find((item) => item.href === ANALYZE_HREF);
  const half = Math.ceil(sideItems.length / 2);
  const left = sideItems.slice(0, half);
  const right = sideItems.slice(half);
  // Keep the center button truly centered when sides are uneven.
  const spacers = Math.max(0, left.length - right.length);

  const analyzeActive =
    pathname === ANALYZE_HREF || pathname.startsWith(`${ANALYZE_HREF}/`);
  const AnalyzeIcon = analyze?.icon;

  return (
    <nav
      className="shrink-0 border-t bg-background/95 backdrop-blur z-40 pb-[max(0px,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <div className="relative flex h-[49px] items-stretch">
        {left.map((item) => (
          <NavTab key={item.href} item={item} />
        ))}

        {/* Center column reserves space for the raised Analyze button */}
        <div className="relative flex flex-1 flex-col items-center justify-end pb-1">
          {AnalyzeIcon ? (
            <Link
              href={ANALYZE_HREF}
              aria-label="Analyze Fit"
              onClick={() => triggerNavHaptic()}
              className="absolute left-1/2 -top-6 -translate-x-1/2"
            >
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full shadow-lg ring-4 ring-background transition-colors",
                  analyzeActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                <Image
                  src="/analyze-fit-logo.png"
                  alt="Analyze Fit"
                  width={28}
                  height={28}
                  priority
                  className="size-7 object-contain"
                />
              </span>
            </Link>
          ) : null}
          <span
            className={cn(
              "text-[10px] font-medium",
              analyzeActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            Analyze Fit
          </span>
        </div>

        {right.map((item) => (
          <NavTab key={item.href} item={item} />
        ))}
        {Array.from({ length: spacers }).map((_, i) => (
          <div key={`spacer-${i}`} className="flex-1" aria-hidden />
        ))}
      </div>
    </nav>
  );
}
