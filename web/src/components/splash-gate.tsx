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
  markWelcomeComplete,
  QA_RETURNING_SPLASH_KEY,
  shouldSkipWelcomeForDevDeepLink,
} from "@/lib/app-session";
import {
  markOnboardingWelcomeRestored,
  resolvePostSplashDestination,
  saveOnboardingProgress,
} from "@/lib/onboarding-progress";
import { isSplashQaEnabled, clearQaLaunchSimulation, getQaLaunchSimulationMode } from "@/lib/splash-qa";
import { markAppShellVisible } from "@/lib/app-shell-visible";
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
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<SplashGatePhase>("pending");
  const phaseRef = useRef<SplashGatePhase>(phase);
  const [replayKey, setReplayKey] = useState(0);
  const [showWordmark, setShowWordmark] = useState(false);

  const resolvedPhase = mounted ? phase : "pending";
  const appVisible = resolvedPhase === "ready";

  const beginSignupPhase = useCallback(
    (targetPathname: string) => {
      consumeSignupLaunch();
      clearSignupQuery(targetPathname);
      saveOnboardingProgress({ phase: "signup", signupStep: 0 });
      setPhase("signup");
    },
    [],
  );

  const routeAfterSplash = useCallback(
    (targetPathname: string) => {
      if (shouldSkipWelcomeForDevDeepLink(targetPathname)) {
        markWelcomeComplete();
        setPhase("ready");
        return;
      }

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

  const beginWelcomeExit = useCallback((_target: string) => {
    markWelcomeComplete();
    clearQaLaunchSimulation();
    setPhase("ready");
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "ready") {
      markAppSessionActive();
    }
  }, [phase]);

  useEffect(() => {
    markAppShellVisible(appVisible);
  }, [appVisible]);

  useLayoutEffect(() => {
    try {
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

      const qaSimulation = isSplashQaEnabled()
        ? getQaLaunchSimulationMode()
        : null;

      if (qaSimulation === "first") {
        coldStartSplashRef.current = false;
        setShowWordmark(true);
        setPhase("splash");
        return;
      }

      if (qaSimulation === "returning") {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(QA_RETURNING_SPLASH_KEY);
        }
        coldStartSplashRef.current = true;
        setShowWordmark(false);
        setPhase("splash");
        return;
      }

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
    } finally {
      setMounted(true);
    }
  }, [beginSignupPhase, pathname, routeAfterSplash]);

  const handleSplashComplete = useCallback(
    (mode: SplashCompleteMode) => {
      const currentPath = pathnameRef.current;
      const qaSimulation = isSplashQaEnabled()
        ? getQaLaunchSimulationMode()
        : null;

      if (mode === "first") {
        markSplashComplete();
        clearQaLaunchSimulation();
        if (isSignupFlowRequested()) {
          beginSignupPhase(currentPath);
          return;
        }
        if (shouldSkipWelcomeForDevDeepLink(currentPath)) {
          markWelcomeComplete();
          setPhase("ready");
          return;
        }
        setPhase("welcome");
        return;
      }

      if (mode === "replay") {
        setPhase("ready");
        return;
      }

      if (qaSimulation === "returning") {
        clearQaLaunchSimulation();
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
    saveOnboardingProgress({ phase: "signup", signupStep: 0 });
    setPhase("signup");
  }, []);

  const handleBackToWelcome = useCallback(() => {
    markOnboardingWelcomeRestored();
    setPhase("welcome");
  }, []);

  const showSplashOverlay =
    resolvedPhase === "pending" ||
    resolvedPhase === "splash" ||
    resolvedPhase === "replay";
  const isLaunchSplash = resolvedPhase === "splash";
  const isReplaySplash = resolvedPhase === "replay";
  const isFirstLaunchSplash = isLaunchSplash && showWordmark;

  return (
    <SplashQaProvider value={{ replaySplash }}>
      <div
        className={cn(!appVisible && "invisible")}
        aria-hidden={!appVisible}
      >
        {children}
      </div>
      {mounted && resolvedPhase === "welcome" ? (
        <WelcomeScreen
          onExit={beginWelcomeExit}
          onSignUp={handleSignUpFromWelcome}
        />
      ) : null}
      {mounted && resolvedPhase === "signup" ? (
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
      {isSplashQaEnabled() && mounted ? <SplashQaPanel /> : null}
    </SplashQaProvider>
  );
}
