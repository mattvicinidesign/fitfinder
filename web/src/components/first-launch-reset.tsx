"use client";

import { useLayoutEffect } from "react";
import {
  canResetWebFirstLaunch,
  isFirstLaunchResetRequested,
  resetWebFirstLaunch,
} from "@/lib/reset-first-launch";

/** `?firstLaunch=1` — wipe browser state and replay first-time launch (web only). */
export function FirstLaunchReset() {
  useLayoutEffect(() => {
    if (!canResetWebFirstLaunch() || !isFirstLaunchResetRequested()) return;
    void resetWebFirstLaunch();
  }, []);

  return null;
}
