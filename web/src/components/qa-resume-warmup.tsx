"use client";

import { useEffect } from "react";
import { isQaRegisteredScoring, warmQaResumePreload } from "@/lib/qa";

/** Resolves QA resume in the background right after sign-in. */
export function QaResumeWarmup({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!signedIn || !isQaRegisteredScoring()) return;
    warmQaResumePreload();
  }, [signedIn]);

  return null;
}
