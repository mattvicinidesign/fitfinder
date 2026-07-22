"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { LaunchOverlayFrame } from "@/components/launch-overlay-frame";
import { WelcomeHeroIllustration } from "@/components/welcome-hero-illustration";
import { ensureGuestSession } from "@/lib/ensure-guest-session";
import { DEFAULT_APP_ROUTE } from "@/lib/app-session";
import { clearOnboardingProgress } from "@/lib/onboarding-progress";
import { navigateApp } from "@/lib/navigate-app";
import { safeBottomOverlay, safeTopHero } from "@/lib/safe-area";
import { SCREEN_PRIMARY_CTA_CLASS, SCREEN_PRIMARY_OUTLINE_CTA_CLASS } from "@/components/resume-upload-styles";
import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  onExit: (target: string) => void;
  onSignUp: () => void;
}

export function WelcomeScreen({ onExit, onSignUp }: WelcomeScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState<"guest" | "account" | null>(null);

  function handleCreateAccount() {
    setBusy("account");
    onSignUp();
    setBusy(null);
  }

  async function handleContinueAsGuest() {
    setBusy("guest");

    try {
      const result = await ensureGuestSession({ completeLaunchFlow: true });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      clearOnboardingProgress();
      onExit(DEFAULT_APP_ROUTE);

      if (pathname === DEFAULT_APP_ROUTE) {
        return;
      }

      navigateApp(DEFAULT_APP_ROUTE, router, "replace");
    } catch {
      toast.error("Could not start guest session. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <LaunchOverlayFrame className={`px-6 ${safeBottomOverlay} ${safeTopHero}`}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="mb-10 flex h-[180px] w-[280px] max-w-full items-center justify-center sm:h-[200px]">
            <WelcomeHeroIllustration />
          </div>

          <h1 className="brand-title-gradient max-w-[320px] text-[26px] font-bold leading-[1.15] tracking-tight sm:text-[28px]">
            Because Sometimes the Best Candidate Doesn&apos;t Look Perfect on
            Paper.
          </h1>

          <p className="mt-5 max-w-[320px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Analyze opportunities, tailor your resume, and focus on the jobs
            worth pursuing.
          </p>

          <div className="mt-12 w-full max-w-sm space-y-3">
            <Button
              type="button"
              className={SCREEN_PRIMARY_CTA_CLASS}
              disabled={busy !== null}
              aria-busy={busy === "account"}
              aria-label={busy === "account" ? "Opening sign up" : "Sign up"}
              onClick={handleCreateAccount}
            >
              {busy === "account" ? <CtaSpinner /> : "Sign up"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(SCREEN_PRIMARY_CTA_CLASS, SCREEN_PRIMARY_OUTLINE_CTA_CLASS)}
              disabled={busy !== null}
              aria-busy={busy === "guest"}
              aria-label={busy === "guest" ? "Starting guest session" : "Use as a guest"}
              onClick={() => void handleContinueAsGuest()}
            >
              {busy === "guest" ? <CtaSpinner /> : "Use as a guest"}
            </Button>
          </div>
        </div>
      </div>
    </LaunchOverlayFrame>
  );
}
