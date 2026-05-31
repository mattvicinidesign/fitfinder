"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { LaunchOverlayFrame } from "@/components/launch-overlay-frame";
import { SplashQaProvider } from "@/components/splash-qa-context";
import { SplashQaPanel } from "@/components/splash-qa-panel";
import { WelcomeScreen } from "@/components/welcome-screen";
import { SignUpScreen } from "@/components/screens/sign-up-screen";
import {
  DEFAULT_APP_ROUTE,
  consumeSignupLaunch,
  hasCompletedSplash,
  isAuthDeepLinkPending,
  isColdAppStart,
  isSignupLaunchRequested,
  markAppSessionActive,
  markSplashComplete,
  QA_RETURNING_SPLASH_KEY,
} from "@/lib/app-session";
import {
  markOnboardingWelcomeRestored,
  resolvePostSplashDestination,
} from "@/lib/onboarding-progress";
import { isSplashQaEnabled } from "@/lib/splash-qa";
import { cn } from "@/lib/utils";

export {
  SPLASH_STORAGE_KEY as SPLASH_SESSION_KEY,
  WELCOME_STORAGE_KEY as WELCOME_SESSION_KEY,
} from "@/lib/app-session";

type SplashGatePhase = "pending" | "splash" | "welcome" | "signup" | "replay" | "ready";
type SplashCompleteMode = "first" | "returning" | "replay";

function isSignupQueryRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("signup") === "1";
}

function clearSignupQuery(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!isSignupQueryRequested()) return;
  window.history.replaceState(null, "", pathname);
}

function isSignupFlowRequested(): boolean {
  return isSignupLaunchRequested() || isSignupQueryRequested();
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const coldLaunchHandled = useRef(false);
  const coldStartSplashRef = useRef(
    typeof window !== "undefined" &&
      hasCompletedSplash() &&
      isColdAppStart() &&
      !isAuthDeepLinkPending(),
  );
  const pathnameRef = useRef(pathname);
  const [phase, setPhase] = useState<SplashGatePhase>(() => {
    if (typeof window === "undefined") return "pending";
    if (!hasCompletedSplash()) return "splash";
    if (isColdAppStart() && !isAuthDeepLinkPending()) return "splash";
    return "pending";
  });
  const phaseRef = useRef<SplashGatePhase>(phase);
  const [replayKey, setReplayKey] = useState(0);
  const [showWordmark, setShowWordmark] = useState(() => {
    if (typeof window === "undefined") return false;
    return !hasCompletedSplash();
  });
  const [welcomeExitTarget, setWelcomeExitTarget] = useState<string | null>(
    null,
  );

  const appVisible = phase === "ready" || phase === "replay";

  const welcomeRouteMatches = useCallback(
    (target: string, path: string) => {
      if (target === "/login") return path.startsWith("/login");
      return path === target || path.startsWith(`${target}/`);
    },
    [],
  );

  const beginSignupPhase = useCallback(
    (targetPathname: string) => {
      consumeSignupLaunch();
      clearSignupQuery(targetPathname);
      setPhase("signup");
    },
    [],
  );

  const routeAfterSplash = useCallback(
    (targetPathname: string) => {
      const destination = resolvePostSplashDestination(isSignupFlowRequested());

      if (destination === "home") {
        setPhase("ready");
        const onHome =
          targetPathname === DEFAULT_APP_ROUTE ||
          targetPathname.startsWith(`${DEFAULT_APP_ROUTE}/`);
        if (!onHome) {
          router.replace(DEFAULT_APP_ROUTE);
        }
        return;
      }

      if (destination === "signup") {
        beginSignupPhase(targetPathname);
        return;
      }

      setPhase("welcome");
    },
    [beginSignupPhase, router],
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

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "ready") {
      markAppSessionActive();
    }
  }, [phase]);

  useLayoutEffect(() => {
    if (pathname.startsWith("/auth/callback")) {
      setPhase("ready");
      return;
    }

    if (coldLaunchHandled.current) {
      if (
        isSignupFlowRequested() &&
        phaseRef.current !== "splash" &&
        phaseRef.current !== "pending"
      ) {
        beginSignupPhase(pathname);
      }
      return;
    }
    coldLaunchHandled.current = true;

    const splashSeen = hasCompletedSplash();
    const forceReturningSplash =
      isSplashQaEnabled() &&
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(QA_RETURNING_SPLASH_KEY) === "true";

    if (!splashSeen) {
      coldStartSplashRef.current = false;
      setShowWordmark(true);
      setPhase("splash");
      return;
    }

    if (forceReturningSplash) {
      sessionStorage.removeItem(QA_RETURNING_SPLASH_KEY);
    }

    if (isAuthDeepLinkPending()) {
      setPhase("ready");
      return;
    }

    if (isColdAppStart()) {
      coldStartSplashRef.current = true;
      setShowWordmark(false);
      setPhase("splash");
      return;
    }

    routeAfterSplash(pathname);
  }, [beginSignupPhase, pathname, routeAfterSplash]);

  const handleSplashComplete = useCallback(
    (mode: SplashCompleteMode) => {
      const currentPath = pathnameRef.current;

      if (mode === "first") {
        markSplashComplete();
        if (isSignupFlowRequested()) {
          beginSignupPhase(currentPath);
          return;
        }
        setPhase("welcome");
        return;
      }

      if (mode === "replay") {
        setPhase("ready");
        return;
      }

      if (coldStartSplashRef.current) {
        coldStartSplashRef.current = false;
        routeAfterSplash(currentPath);
        return;
      }

      setPhase("ready");
    },
    [beginSignupPhase, routeAfterSplash],
  );

  const replaySplash = useCallback(() => {
    setReplayKey((key) => key + 1);
    setShowWordmark(true);
    setPhase("replay");
  }, []);

  const handleSignUpFromWelcome = useCallback(() => {
    setPhase("signup");
  }, []);

  const handleBackToWelcome = useCallback(() => {
    markOnboardingWelcomeRestored();
    setPhase("welcome");
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
        <WelcomeScreen
          onExit={beginWelcomeExit}
          onSignUp={handleSignUpFromWelcome}
        />
      ) : null}
      {phase === "signup" ? (
        <LaunchOverlayFrame className="overflow-hidden">
          <SignUpScreen embedded onBackToWelcome={handleBackToWelcome} />
        </LaunchOverlayFrame>
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
