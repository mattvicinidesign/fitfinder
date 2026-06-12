"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isSplashQaEnabled,
  resetFirstLaunchFromQa,
  simulateFirstLaunch,
  simulateReturningUser,
} from "@/lib/splash-qa";
import { safeBottomTabBar, safeTopFloating } from "@/lib/safe-area";
import { isNativePlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useSplashQa } from "@/components/splash-qa-context";

export function SplashQaPanel() {
  const [open, setOpen] = useState(false);
  const splashQa = useSplashQa();

  if (!isSplashQaEnabled()) return null;

  function handleReplaySplash() {
    console.log("QA: Replay Splash");
    setOpen(false);
    splashQa?.replaySplash();
  }

  const qaButtonClass =
    "h-9 w-full justify-start rounded-lg border-primary/70 text-[13px] font-medium";

  return (
    <div
      className={cn(
        "fixed z-[110] flex flex-col items-end gap-2",
        isNativePlatform()
          ? `bottom-4 right-4 ${safeBottomTabBar}`
          : `right-4 ${safeTopFloating}`,
      )}
    >
      {open ? (
        <div className="w-64 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Splash QA
          </p>
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              onClick={simulateFirstLaunch}
            >
              Simulate first launch
            </Button>
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              onClick={simulateReturningUser}
            >
              Simulate returning user
            </Button>
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              onClick={handleReplaySplash}
            >
              Replay splash now
            </Button>
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              onClick={() => {
                setOpen(false);
                resetFirstLaunchFromQa();
              }}
            >
              Reset first launch (full)
            </Button>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.08em] shadow-md",
          open && "bg-muted",
        )}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open splash QA controls"
      >
        QA
      </Button>
    </div>
  );
}
