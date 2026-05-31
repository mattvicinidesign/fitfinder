"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { LaunchOverlayFrame } from "@/components/launch-overlay-frame";
import { SplashQaProvider } from "@/components/splash-qa-context";
import { SplashQaPanel } from "@/components/splash-qa-panel";
import { WelcomeScreen } from "@/components/welcome-screen";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_APP_ROUTE,
  hasCompletedSplash,
  hasCompletedWelcome,
  isWarmAppSession,
  markAppSessionActive,
  markLaunchFlowComplete,
  markSplashComplete,
  QA_RETURNING_SPLASH_KEY,
} from "@/lib/app-session";
import { isSplashQaEnabled } from "@/lib/splash-qa";
import { cn } from "@/lib/utils";

export {
  SPLASH_STORAGE_KEY as SPLASH_SESSION_KEY,
  WELCOME_STORAGE_KEY as WELCOME_SESSION_KEY,
} from "@/lib/app-session";

type SplashGatePhase = "pending" | "splash" | "welcome" | "replay" | "ready";
type SplashCompleteMode = "first" | "returning" | "replay";

export function SplashGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<SplashGatePhase>(() => {
    if (typeof window === "undefined") return "pending";
    return isWarmAppSession() ? "ready" : "pending";
  });
  const [replayKey, setReplayKey] = useState(0);
  const [showWordmark, setShowWordmark] = useState(false);
  const [welcomeExitTarget, setWelcomeExitTarget] = useState<string | null>(
    null,
  );

  const appVisible = phase === "ready" || phase === "replay";

  const welcomeRouteMatches = useCallback(
    (target: string, path: string) => {
      if (target === "/login") return path.startsWith("/login");
      if (target === "/signup") return path.startsWith("/signup");
      return path === target || path.startsWith(`${target}/`);
    },
    [],
  );

  const beginWelcomeExit = useCallback(
    (target: string) => {
      setWelcomeExitTarget(target);
      if (welcomeRouteMatches(target, pathname)) {
        setPhase("ready");
        setWelcomeExitTarget(null);
      }
    },
    [pathname, welcomeRouteMatches],
  );

  useEffect(() => {
    if (!welcomeExitTarget) return;
    if (!welcomeRouteMatches(welcomeExitTarget, pathname)) return;
    setPhase("ready");
    setWelcomeExitTarget(null);
  }, [pathname, welcomeExitTarget, welcomeRouteMatches]);

  useLayoutEffect(() => {
    if (pathname.startsWith("/auth/callback")) {
      setPhase("ready");
      return;
    }

    if (isWarmAppSession()) {
      setPhase("ready");
      return;
    }

    markAppSessionActive();

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const splashSeen = hasCompletedSplash();
      const welcomeSeen = hasCompletedWelcome();
      const launchComplete = splashSeen && welcomeSeen;
      const forceReturningSplash =
        isSplashQaEnabled() &&
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(QA_RETURNING_SPLASH_KEY) === "true";

      const user = session?.user;
      const isRegistered = !!(user && !user.is_anonymous);

      if (isRegistered && launchComplete && !forceReturningSplash) {
        markLaunchFlowComplete();
        setPhase("ready");
        return;
      }

      if (!splashSeen) {
        setShowWordmark(true);
        setPhase("splash");
        return;
      }

      if (!welcomeSeen) {
        setPhase("welcome");
        return;
      }

      if (forceReturningSplash) {
        sessionStorage.removeItem(QA_RETURNING_SPLASH_KEY);
      }

      setShowWordmark(false);
      setPhase("splash");
    });
  }, [pathname]);

  const handleSplashComplete = useCallback(
    (mode: SplashCompleteMode) => {
      if (mode === "first") {
        markSplashComplete();
        setPhase("welcome");
        return;
      }

      if (mode === "replay") {
        setPhase("ready");
        return;
      }

      setPhase("ready");
      router.replace(DEFAULT_APP_ROUTE);
    },
    [router],
  );

  const replaySplash = useCallback(() => {
    setReplayKey((key) => key + 1);
    setShowWordmark(true);
    setPhase("replay");
  }, []);

  const showSplashOverlay =
    phase === "pending" || phase === "splash" || phase === "replay";
  const isLaunchSplash = phase === "splash";
  const isReplaySplash = phase === "replay";
  const isFirstLaunchSplash = isLaunchSplash && showWordmark;

  return (
    <SplashQaProvider value={{ replaySplash }}>
      <div
        className={cn(!appVisible && "invisible")}
        aria-hidden={!appVisible}
      >
        {children}
      </div>
      {phase === "welcome" ? (
        <WelcomeScreen onExit={beginWelcomeExit} />
      ) : null}
      {showSplashOverlay ? (
        isLaunchSplash || isReplaySplash ? (
          <SplashScreen
            key={isReplaySplash ? `replay-${replayKey}` : "launch"}
            showWordmark={isReplaySplash || showWordmark}
            onComplete={() =>
              handleSplashComplete(
                isReplaySplash
                  ? "replay"
                  : isFirstLaunchSplash
                    ? "first"
                    : "returning",
              )
            }
          />
        ) : (
          <LaunchOverlayFrame aria-hidden />
        )
      ) : null}
      {isSplashQaEnabled() ? <SplashQaPanel /> : null}
    </SplashQaProvider>
  );
}
