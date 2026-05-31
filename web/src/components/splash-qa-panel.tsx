"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isSplashQaEnabled,
  simulateFirstLaunch,
  simulateReturningUser,
} from "@/lib/splash-qa";
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

  return (
    <div className="fixed bottom-4 right-4 z-[110] flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)]">
      {open ? (
        <div className="w-64 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Splash QA
          </p>
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full justify-start rounded-lg text-[13px]"
              onClick={simulateFirstLaunch}
            >
              Simulate first launch
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full justify-start rounded-lg text-[13px]"
              onClick={simulateReturningUser}
            >
              Simulate returning user
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full justify-start rounded-lg text-[13px]"
              onClick={handleReplaySplash}
            >
              Replay splash now
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
