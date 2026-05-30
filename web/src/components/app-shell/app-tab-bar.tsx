"use client";

import { APP_NAV } from "@/lib/navigation";
import { NavTab } from "@/components/app-shell/nav-tab";

/**
 * Primary navigation everywhere — iOS tab bar pattern on all platforms.
 */
export function AppTabBar() {
  return (
    <nav
      className="shrink-0 border-t bg-background/95 backdrop-blur z-40 pb-[max(0px,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <div className="flex h-[49px] items-stretch">
        {APP_NAV.map((item) => (
          <NavTab key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
