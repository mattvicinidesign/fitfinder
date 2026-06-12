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

export type ProfileSheetPhase = "hidden" | "open";

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

  const returnPathRef = useRef("/home");
  const closingRef = useRef(false);

  const [phase, setPhase] = useState<ProfileSheetPhase>("hidden");

  const showSheet =
    !closingRef.current && (phase !== "hidden" || isProfileRoute);

  const finishExit = useCallback(() => {
    const target = returnPathRef.current;
    clearProfileReturnPath();
    setPhase("hidden");
    router.replace(target);
  }, [router]);

  const closeProfile = useCallback(() => {
    if (closingRef.current || phase === "hidden") return;

    returnPathRef.current = getProfileReturnPath();
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
      setPhase("open");
      router.push("/profile");
    },
    [router],
  );

  useLayoutEffect(() => {
    if (isProfileRoute && phase === "hidden") {
      setPhase("open");
    }
  }, [isProfileRoute, phase]);

  const overlay = showSheet ? (
    <>
      {underlay ? (
        <div className="absolute inset-0 z-10 overflow-hidden" aria-hidden>
          {underlay}
        </div>
      ) : null}
      <ProfileSheetCloseProvider onClose={closeProfile}>
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.35)]">
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
