"use client";

import { createContext, useContext, type ReactNode } from "react";

const ResumeReviewCategorySheetCloseContext = createContext<
  (() => void) | null
>(null);

export function ResumeReviewCategorySheetCloseProvider({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ResumeReviewCategorySheetCloseContext.Provider value={onClose}>
      {children}
    </ResumeReviewCategorySheetCloseContext.Provider>
  );
}

export function useResumeReviewCategorySheetClose(): (() => void) | null {
  return useContext(ResumeReviewCategorySheetCloseContext);
}
