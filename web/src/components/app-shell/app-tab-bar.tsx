"use client";

import { BOTTOM_TAB_NAV } from "@/lib/navigation";
import { NavTab } from "@/components/app-shell/nav-tab";
import { safeBottomTabBar } from "@/lib/safe-area";

/**
 * Primary navigation — five tabs; Analyze Fit is the home screen CTA.
 */
export function AppTabBar() {
  return (
    <nav
      className={`shrink-0 border-t bg-background/95 backdrop-blur z-40 ${safeBottomTabBar}`}
      aria-label="Main"
    >
      <div className="flex h-[49px] items-stretch">
        {BOTTOM_TAB_NAV.map((item) => (
          <NavTab key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
