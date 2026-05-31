"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearProfileReturnPath,
  consumeProfileSheetEnter,
  getProfileReturnPath,
} from "@/lib/profile-sheet";
import { ProfileSheetCloseProvider } from "@/components/app-shell/profile-sheet-context";
import { cn } from "@/lib/utils";

type SheetPhase = "pending" | "enter" | "idle" | "exit";

export function ProfileSheet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const shouldAnimateRef = useRef(consumeProfileSheetEnter());
  const [phase, setPhase] = useState<SheetPhase>(() =>
    shouldAnimateRef.current ? "pending" : "idle",
  );
  const closingRef = useRef(false);

  useLayoutEffect(() => {
    if (!shouldAnimateRef.current) return;
    const frame = requestAnimationFrame(() => setPhase("enter"));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (phase !== "enter") return;
    const timer = window.setTimeout(() => setPhase("idle"), 420);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    const returnPath = getProfileReturnPath();

    if (!shouldAnimateRef.current) {
      clearProfileReturnPath();
      router.replace(returnPath);
      return;
    }

    setPhase("exit");
    window.setTimeout(() => {
      clearProfileReturnPath();
      router.replace(returnPath);
    }, 320);
  }, [router]);

  return (
    <ProfileSheetCloseProvider onClose={close}>
      <div
        className={cn(
          "absolute inset-0 z-20 flex min-h-0 flex-col bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
          phase === "pending" && "profile-sheet-pending",
          phase === "enter" && "profile-sheet-enter",
          phase === "exit" && "profile-sheet-exit",
        )}
      >
        {children}
      </div>
    </ProfileSheetCloseProvider>
  );
}
