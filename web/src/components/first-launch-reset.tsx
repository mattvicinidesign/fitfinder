"use client";

import { useLayoutEffect } from "react";
import {
  canResetAppFirstLaunch,
  isFirstLaunchResetRequested,
  resetAppFirstLaunch,
} from "@/lib/reset-first-launch";

/** `?firstLaunch=1` — wipe app state and replay first-time launch (web + native). */
export function FirstLaunchReset() {
  useLayoutEffect(() => {
    if (!canResetAppFirstLaunch() || !isFirstLaunchResetRequested()) return;
    void resetAppFirstLaunch();
  }, []);

  return null;
}
