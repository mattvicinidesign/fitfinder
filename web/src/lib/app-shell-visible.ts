"use client";

import { useSyncExternalStore } from "react";

let appShellVisible = false;
const listeners = new Set<() => void>();

export function markAppShellVisible(visible: boolean): void {
  if (appShellVisible === visible) return;
  appShellVisible = visible;
  for (const listener of listeners) listener();
}

function getAppShellVisible(): boolean {
  return appShellVisible;
}

function subscribeAppShellVisible(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** True once SplashGate reveals the app (after splash / welcome). */
export function useAppShellVisible(): boolean {
  return useSyncExternalStore(
    subscribeAppShellVisible,
    getAppShellVisible,
    () => false,
  );
}
