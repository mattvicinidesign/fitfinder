"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROTECTED_PREFIXES } from "@/lib/navigation";
import { hasCompletedWelcome } from "@/lib/app-session";
import { AppFrame } from "@/components/app-shell/app-frame";
import { AppTabBar } from "@/components/app-shell/app-tab-bar";
import {
  ProfileOverlayProvider,
  useProfileOverlay,
} from "@/components/app-shell/profile-overlay";
import { SkeletonAppShell } from "@/components/ui/skeletons";
import { navigateApp } from "@/lib/navigate-app";
import { isNativePlatform } from "@/lib/platform";

/**
 * Canonical app chrome: centered phone-width frame + iOS tab bar on every platform.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const underlyingRef = useRef<React.ReactNode>(null);
  const profileContentRef = useRef<React.ReactNode>(null);

  const isProfile = pathname === "/profile";
  const isPreview = pathname === "/preview";

  if (isProfile) {
    profileContentRef.current = children;
  } else {
    underlyingRef.current = children;
  }

  const needsAuth =
    !isPreview &&
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session?.user);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready || !needsAuth || signedIn) return;
    if (isNativePlatform() && !hasCompletedWelcome()) return;

    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setSignedIn(true);
        return;
      }
      const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
      if (isNativePlatform()) {
        navigateApp(loginUrl, router, "replace");
        return;
      }
      router.replace(loginUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [ready, needsAuth, signedIn, pathname, router]);

  const launchGateActive =
    isNativePlatform() && !hasCompletedWelcome();

  if (launchGateActive) {
    return null;
  }

  if (!ready) {
    const hideTabBar =
      pathname === "/analyze" ||
      pathname.startsWith("/analyze/report") ||
      isProfile;
    return (
      <AppFrame>
        <SkeletonAppShell showTabBar={!hideTabBar} />
      </AppFrame>
    );
  }

  if (needsAuth && !signedIn) {
    const hideTabBar =
      pathname === "/analyze" ||
      pathname.startsWith("/analyze/report") ||
      isProfile;
    return (
      <AppFrame>
        <SkeletonAppShell showTabBar={!hideTabBar} />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <ProfileOverlayProvider
        underlay={underlyingRef.current}
        profileContent={
          isProfile ? (profileContentRef.current ?? children) : null
        }
      >
        <AppShellChrome>{children}</AppShellChrome>
      </ProfileOverlayProvider>
    </AppFrame>
  );
}

function AppShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { showSheet, overlay } = useProfileOverlay();
  const isAnalyzeFlow =
    pathname === "/analyze" || pathname.startsWith("/analyze/report");
  const hideTabBar = isAnalyzeFlow || showSheet;
  const lockMainScroll = isAnalyzeFlow || showSheet;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main
        className={
          lockMainScroll
            ? "relative min-h-0 flex-1 overflow-hidden"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
        }
      >
        {overlay}
        {showSheet ? null : children}
      </main>
      {hideTabBar ? null : <AppTabBar />}
    </div>
  );
}
