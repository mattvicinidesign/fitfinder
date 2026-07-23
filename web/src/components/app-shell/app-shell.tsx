"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROTECTED_PREFIXES } from "@/lib/navigation";
import { hasCompletedWelcome } from "@/lib/app-session";
import { AppFrame } from "@/components/app-shell/app-frame";
import { AppTabBar } from "@/components/app-shell/app-tab-bar";
import {
  isResumeReviewCategoryRoute,
  ResumeReviewCategoryOverlayProvider,
  useResumeReviewCategoryOverlay,
} from "@/components/app-shell/resume-review-category-overlay";
import { ResumeReviewScreen } from "@/components/screens/resume-review-screen";
import { SkeletonAppShell } from "@/components/ui/skeletons";
import { ensureGuestSession } from "@/lib/ensure-guest-session";
import { isNativePlatform } from "@/lib/platform";
import { isQaLaunchSimulationPending, QA_LAUNCH_SIMULATION_CLEARED_EVENT } from "@/lib/splash-qa";
import { toast } from "sonner";

/**
 * Canonical app chrome: centered phone-width frame + iOS tab bar on every platform.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [guestBootstrapTick, setGuestBootstrapTick] = useState(0);
  const resumeReviewUnderlayRef = useRef<React.ReactNode>(null);
  const resumeReviewCategoryContentRef = useRef<React.ReactNode>(null);

  const isPreview = pathname === "/preview";
  const isResumeReviewCategory = isResumeReviewCategoryRoute(pathname);
  const isResumeReviewMain = pathname === "/resume-review";

  if (isResumeReviewCategory) {
    resumeReviewCategoryContentRef.current = children;
  } else if (isResumeReviewMain) {
    resumeReviewUnderlayRef.current = children;
  }

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const shouldBootstrapGuest = needsAuth || isPreview;

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const bumpGuestBootstrap = () => {
      setGuestBootstrapTick((tick) => tick + 1);
    };
    window.addEventListener(QA_LAUNCH_SIMULATION_CLEARED_EVENT, bumpGuestBootstrap);
    return () => {
      window.removeEventListener(
        QA_LAUNCH_SIMULATION_CLEARED_EVENT,
        bumpGuestBootstrap,
      );
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Wait for INITIAL_SESSION (storage restore) before treating "no session"
    // as a cue to create an anonymous guest — otherwise a full WebView reload
    // can race getSession() → null and overwrite a registered login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready || !shouldBootstrapGuest || signedIn) return;
    if (isQaLaunchSimulationPending()) return;
    if (isNativePlatform() && !hasCompletedWelcome()) return;

    let cancelled = false;

    void ensureGuestSession({
      deferLaunchCompletion: !hasCompletedWelcome(),
    }).then(({ error }) => {
      if (cancelled) return;
      if (error) {
        setAuthError(error);
        toast.error(error);
        return;
      }

      setAuthError(null);
      setSignedIn(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ready, shouldBootstrapGuest, signedIn, pathname, router, guestBootstrapTick]);

  const launchGateActive =
    mounted && isNativePlatform() && !hasCompletedWelcome();

  if (launchGateActive) {
    return null;
  }

  if (!ready) {
    const hideTabBar =
      pathname === "/analyze" ||
      pathname.startsWith("/analyze/report");
    return (
      <AppFrame>
        <SkeletonAppShell showTabBar={!hideTabBar} />
      </AppFrame>
    );
  }

  if (needsAuth && !signedIn) {
    if (authError) {
      return (
        <AppFrame>
          <main className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-base font-medium text-foreground">
              Cannot connect to Fit Finder
            </p>
            <p className="text-sm text-muted-foreground">{authError}</p>
            <p className="text-xs text-muted-foreground">
              Check `NEXT_PUBLIC_SUPABASE_URL` in `web/.env.local` and restart
              the dev server.
            </p>
          </main>
        </AppFrame>
      );
    }

    const hideTabBar =
      pathname === "/analyze" ||
      pathname.startsWith("/analyze/report");
    return (
      <AppFrame>
        <SkeletonAppShell showTabBar={!hideTabBar} />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <ResumeReviewCategoryOverlayProvider
        underlay={resumeReviewUnderlayRef.current ?? <ResumeReviewScreen />}
        categoryContent={
          isResumeReviewCategory
            ? (resumeReviewCategoryContentRef.current ?? children)
            : null
        }
      >
        <AppShellChrome>{children}</AppShellChrome>
      </ResumeReviewCategoryOverlayProvider>
    </AppFrame>
  );
}

function AppShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { showSheet: showCategorySheet, overlay: categoryOverlay } =
    useResumeReviewCategoryOverlay();
  const isAnalyzeFlow =
    pathname === "/analyze" || pathname.startsWith("/analyze/report");
  const usesInternalScroll =
    pathname === "/home" ||
    pathname === "/profile" ||
    pathname === "/stats" ||
    pathname === "/onboarding" ||
    pathname === "/resume-review" ||
    isAnalyzeFlow;
  const showAnySheet = showCategorySheet;
  const hideTabBar = isAnalyzeFlow;
  const lockMainScroll = usesInternalScroll || showAnySheet;

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <main
        className={
          lockMainScroll
            ? "relative min-h-0 min-w-0 flex-1 overflow-hidden overflow-x-hidden"
            : "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y"
        }
        {...(!lockMainScroll && { "data-app-scroll-y": true })}
      >
        {showAnySheet ? null : children}
      </main>
      {hideTabBar ? null : <AppTabBar />}
      {categoryOverlay}
    </div>
  );
}
