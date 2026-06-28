"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyPendingSignupProfile } from "@/lib/pending-signup";
import {
  DEFAULT_APP_ROUTE,
  getLastRoute,
  isWarmAppSession,
  saveLastRoute,
  shouldPersistRoute,
} from "@/lib/app-session";
import { navigateApp } from "@/lib/navigate-app";
import { ensureSampleAnalysisDataSeeded } from "@/lib/sample-analyses";

/**
 * Keeps the in-app route while the app stays alive in memory, and restores it
 * on warm resume if the WebView briefly resets to the root URL.
 */
export function AppSessionBridge() {
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    ensureSampleAnalysisDataSeeded();
    void import("@/lib/splash-qa").then(({ stripQaHardRefreshParam }) => {
      stripQaHardRefreshParam();
    });
  }, []);

  useLayoutEffect(() => {
    if (!isWarmAppSession()) return;

    const lastRoute = getLastRoute();
    if (lastRoute && pathname === "/" && shouldPersistRoute(lastRoute)) {
      navigateApp(lastRoute, router, "replace");
    }
  }, [pathname, router]);

  useEffect(() => {
    void (async () => {
      const { isQaLaunchSimulationPending } = await import("@/lib/splash-qa");
      if (isQaLaunchSimulationPending()) return;

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { hasInProgressSignup } = await import("@/lib/onboarding-progress");
      const { markAppSessionActive, markLaunchFlowComplete } = await import(
        "@/lib/app-session"
      );
      if (hasInProgressSignup()) {
        markAppSessionActive();
        return;
      }
      markLaunchFlowComplete();
      markAppSessionActive();
      await applyPendingSignupProfile();
    })();
  }, []);

  useEffect(() => {
    if (!isWarmAppSession()) return;
    saveLastRoute(pathname);
  }, [pathname]);

  return null;
}

export { DEFAULT_APP_ROUTE };
