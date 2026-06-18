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
import { navigateApp } from "@/lib/navigate-app";
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

  const closeCategory = useCallback(() => {
    if (!isCategoryRoute) return;
    navigateApp("/resume-review", router, "replace");
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
    <div className="absolute inset-0 z-50 flex min-h-0 flex-col justify-end overflow-hidden">
      {underlay ? (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {underlay}
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Close category details"
        className="bottom-sheet-backdrop-fade-in absolute inset-0 bg-black/55"
        onClick={closeCategory}
      />
      <ResumeReviewCategorySheetCloseProvider onClose={closeCategory}>
        <div
          className={cn(
            "relative flex max-h-[92%] min-h-0 w-full flex-col overflow-hidden",
            "rounded-t-2xl border border-border/60 bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
            "bottom-sheet-slide-up",
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
