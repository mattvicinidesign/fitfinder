"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearProfileReturnPath,
  getProfileReturnPath,
  markProfileSheetEnter,
} from "@/lib/profile-sheet";
import { ProfileSheetCloseProvider } from "@/components/app-shell/profile-sheet-context";

const DURATION_MS = 400;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type ProfileSheetPhase = "hidden" | "entering" | "open";

type ProfileOverlayContextValue = {
  phase: ProfileSheetPhase;
  showSheet: boolean;
  overlay: ReactNode;
  openProfile: (returnPath: string) => void;
  closeProfile: () => void;
};

const ProfileOverlayContext = createContext<ProfileOverlayContextValue | null>(
  null,
);

export function useProfileOverlay(): ProfileOverlayContextValue {
  const ctx = useContext(ProfileOverlayContext);
  if (!ctx) {
    throw new Error("useProfileOverlay requires ProfileOverlayProvider");
  }
  return ctx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setPanelTransform(
  panel: HTMLDivElement,
  yPercent: number,
  animate: boolean,
) {
  panel.style.transition = animate
    ? `transform ${DURATION_MS}ms ${EASE}`
    : "none";
  panel.style.transform = `translate3d(0, ${yPercent}%, 0)`;
}

function waitForTransform(
  panel: HTMLDivElement,
  onDone: () => void,
): () => void {
  let finished = false;

  const done = () => {
    if (finished) return;
    finished = true;
    panel.removeEventListener("transitionend", onTransitionEnd);
    window.clearTimeout(timer);
    onDone();
  };

  const onTransitionEnd = (event: Event) => {
    const te = event as TransitionEvent;
    if (te.target !== panel || te.propertyName !== "transform") return;
    done();
  };

  panel.addEventListener("transitionend", onTransitionEnd);
  const timer = window.setTimeout(done, DURATION_MS + 60);

  return () => {
    if (!finished) {
      finished = true;
      panel.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timer);
    }
  };
}

export function ProfileOverlayProvider({
  children,
  underlay,
  profileContent,
}: {
  children: ReactNode;
  underlay: ReactNode | null;
  profileContent: ReactNode | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isProfileRoute = pathname === "/profile";

  const panelRef = useRef<HTMLDivElement>(null);
  const returnPathRef = useRef("/home");
  const animateEnterRef = useRef(false);
  const wasProfileRouteRef = useRef(false);
  const cleanupAnimRef = useRef<(() => void) | null>(null);
  const closingRef = useRef(false);

  const [phase, setPhase] = useState<ProfileSheetPhase>("hidden");

  const showSheet =
    !closingRef.current && (phase !== "hidden" || isProfileRoute);

  const finishExit = useCallback(() => {
    const target = returnPathRef.current;
    clearProfileReturnPath();
    setPhase("hidden");
    animateEnterRef.current = false;
    router.replace(target);
  }, [router]);

  const closeProfile = useCallback(() => {
    if (closingRef.current || phase === "hidden") return;

    returnPathRef.current = getProfileReturnPath();
    cleanupAnimRef.current?.();
    closingRef.current = true;
    setPhase("hidden");
    finishExit();
  }, [phase, finishExit]);

  useLayoutEffect(() => {
    if (!isProfileRoute) {
      closingRef.current = false;
    }
  }, [isProfileRoute]);

  const openProfile = useCallback(
    (returnPath: string) => {
      returnPathRef.current = returnPath;
      closingRef.current = false;
      markProfileSheetEnter(returnPath);
      animateEnterRef.current = true;
      cleanupAnimRef.current?.();
      setPhase("entering");
      router.push("/profile");
    },
    [router],
  );

  useLayoutEffect(() => {
    const landedOnProfile = isProfileRoute && !wasProfileRouteRef.current;
    wasProfileRouteRef.current = isProfileRoute;

    if (!landedOnProfile || phase !== "hidden") return;

    animateEnterRef.current = false;
    setPhase("open");
    const panel = panelRef.current;
    if (panel) {
      setPanelTransform(panel, 0, false);
    }
  }, [isProfileRoute, phase]);

  useLayoutEffect(() => {
    if (phase !== "entering" || !profileContent) return;

    cleanupAnimRef.current?.();

    const panel = panelRef.current;
    if (!panel) return;

    if (!animateEnterRef.current || prefersReducedMotion()) {
      setPanelTransform(panel, 0, false);
      setPhase("open");
      return;
    }

    setPanelTransform(panel, 100, false);
    let cancelled = false;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setPanelTransform(panel, 0, true);
        cleanupAnimRef.current = waitForTransform(panel, () => {
          if (!cancelled) setPhase("open");
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanupAnimRef.current?.();
      cleanupAnimRef.current = null;
    };
  }, [phase, profileContent]);

  useLayoutEffect(() => {
    return () => cleanupAnimRef.current?.();
  }, []);

  const overlay = showSheet ? (
    <>
      {underlay ? (
        <div className="absolute inset-0 z-10 overflow-hidden" aria-hidden>
          {underlay}
        </div>
      ) : null}
      <ProfileSheetCloseProvider onClose={closeProfile}>
        <div
          ref={panelRef}
          className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
          style={
            phase === "entering"
              ? { transform: "translate3d(0, 100%, 0)" }
              : undefined
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">{profileContent}</div>
        </div>
      </ProfileSheetCloseProvider>
    </>
  ) : null;

  const contextValue: ProfileOverlayContextValue = {
    phase,
    showSheet,
    overlay,
    openProfile,
    closeProfile,
  };

  return (
    <ProfileOverlayContext.Provider value={contextValue}>
      {children}
    </ProfileOverlayContext.Provider>
  );
}
