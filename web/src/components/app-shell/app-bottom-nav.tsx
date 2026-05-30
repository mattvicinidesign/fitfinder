"use client";

import { APP_NAV } from "@/lib/navigation";
import { NavLink } from "@/components/app-shell/nav-link";

/** Mobile + Capacitor iOS — bottom tab bar. */
export function AppBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0px,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <div className="flex h-14 items-stretch px-1">
        {APP_NAV.map((item) => (
          <NavLink key={item.href} item={item} variant="tab" />
        ))}
      </div>
    </nav>
  );
}
