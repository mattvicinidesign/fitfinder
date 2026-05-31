"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import {
  DEFAULT_APP_ROUTE,
  getLastRoute,
  isWarmAppSession,
  saveLastRoute,
  shouldPersistRoute,
} from "@/lib/app-session";
import { navigateApp } from "@/lib/navigate-app";

/**
 * Keeps the in-app route while the app stays alive in memory, and restores it
 * on warm resume if the WebView briefly resets to the root URL.
 */
export function AppSessionBridge() {
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    if (!isWarmAppSession()) return;

    const lastRoute = getLastRoute();
    if (lastRoute && pathname === "/" && shouldPersistRoute(lastRoute)) {
      navigateApp(lastRoute, router, "replace");
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!isWarmAppSession()) return;
    saveLastRoute(pathname);
  }, [pathname]);

  return null;
}

export { DEFAULT_APP_ROUTE };
