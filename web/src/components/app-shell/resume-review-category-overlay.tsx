"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResumeReviewCategorySheetCloseProvider } from "@/components/app-shell/resume-review-category-sheet-context";
import { cn } from "@/lib/utils";

export type ResumeReviewCategorySheetPhase = "hidden" | "open";

type ResumeReviewCategoryOverlayContextValue = {
  phase: ResumeReviewCategorySheetPhase;
  showSheet: boolean;
  overlay: ReactNode;
};

const ResumeReviewCategoryOverlayContext =
  createContext<ResumeReviewCategoryOverlayContextValue | null>(null);

export function useResumeReviewCategoryOverlay(): ResumeReviewCategoryOverlayContextValue {
  const ctx = useContext(ResumeReviewCategoryOverlayContext);
  if (!ctx) {
    throw new Error(
      "useResumeReviewCategoryOverlay requires ResumeReviewCategoryOverlayProvider",
    );
  }
  return ctx;
}

export function isResumeReviewCategoryRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/resume-review/") && pathname !== "/resume-review"
  );
}

export function ResumeReviewCategoryOverlayProvider({
  children,
  underlay,
  categoryContent,
}: {
  children: ReactNode;
  underlay: ReactNode | null;
  categoryContent: ReactNode | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCategoryRoute = isResumeReviewCategoryRoute(pathname);

  const showSheet = isCategoryRoute;
  const phase: ResumeReviewCategorySheetPhase = isCategoryRoute
    ? "open"
    : "hidden";

  // Client replace (same as profile sheet) — full document loads re-run splash routing
  // and incorrectly bounce non-home routes to /home on native.
  const closeCategory = useCallback(() => {
    if (!isCategoryRoute) return;
    router.replace("/resume-review");
  }, [router, isCategoryRoute]);

  useEffect(() => {
    if (!showSheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCategory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSheet, closeCategory]);

  const overlay = showSheet ? (
    <div className="absolute inset-0 z-50 overflow-hidden">
      {underlay ? (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {underlay}
        </div>
      ) : null}
      <ResumeReviewCategorySheetCloseProvider onClose={closeCategory}>
        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-background",
            "shadow-[0_-8px_32px_rgba(0,0,0,0.35)] bottom-sheet-slide-up",
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {categoryContent}
          </div>
        </div>
      </ResumeReviewCategorySheetCloseProvider>
    </div>
  ) : null;

  return (
    <ResumeReviewCategoryOverlayContext.Provider
      value={{ phase, showSheet, overlay }}
    >
      {children}
    </ResumeReviewCategoryOverlayContext.Provider>
  );
}
