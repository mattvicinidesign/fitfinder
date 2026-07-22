"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isSplashQaEnabled,
  softResetFromQa,
  hardResetFromQa,
} from "@/lib/splash-qa";
import {
  enterDashboardAsQaAccount,
  getQaAccountMode,
  QA_ACCOUNT_MODE_CHANGED_EVENT,
  type QaAccountMode,
} from "@/lib/qa-account-mode";
import { safeBottomTabBar, safeTopFloating } from "@/lib/safe-area";
import { isNativePlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SplashQaPanel() {
  const [open, setOpen] = useState(false);
  const [busyMode, setBusyMode] = useState<QaAccountMode | null>(null);
  const [accountMode, setAccountMode] = useState<QaAccountMode | null>(null);

  useEffect(() => {
    function syncMode() {
      setAccountMode(getQaAccountMode());
    }
    syncMode();
    window.addEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, syncMode);
    return () => {
      window.removeEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, syncMode);
    };
  }, []);

  if (!isSplashQaEnabled()) return null;

  const qaButtonClass =
    "h-9 w-full justify-start rounded-lg border-primary/70 text-[13px] font-medium";

  async function enterAs(mode: QaAccountMode) {
    setBusyMode(mode);
    const { error } = await enterDashboardAsQaAccount(mode);
    setBusyMode(null);
    if (error) {
      toast.error(error);
      return;
    }
    setOpen(false);
  }

  return (
    <div
      className={cn(
        "fixed z-[110] flex flex-col items-end gap-2",
        isNativePlatform()
          ? `bottom-4 right-4 ${safeBottomTabBar}`
          : `right-4 ${safeTopFloating}`,
      )}
    >
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

      {open ? (
        <div className="w-60 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Splash QA
          </p>
          {accountMode ? (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Viewing as{" "}
              <span className="font-semibold text-foreground">
                {accountMode === "registered" ? "registered" : "guest"}
              </span>
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              disabled={busyMode !== null}
              onClick={() => void enterAs("registered")}
            >
              {busyMode === "registered"
                ? "Opening…"
                : "Enter as registered"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={qaButtonClass}
              disabled={busyMode !== null}
              onClick={() => void enterAs("guest")}
            >
              {busyMode === "guest" ? "Opening…" : "Enter as guest"}
            </Button>
            <div className="border-t border-border/50 pt-2">
              <Button
                type="button"
                variant="outline"
                className={qaButtonClass}
                disabled={busyMode !== null}
                onClick={() => {
                  setOpen(false);
                  hardResetFromQa();
                }}
              >
                Hard reset
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(qaButtonClass, "mt-2")}
                disabled={busyMode !== null}
                onClick={() => {
                  setOpen(false);
                  softResetFromQa();
                }}
              >
                Soft reset
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
