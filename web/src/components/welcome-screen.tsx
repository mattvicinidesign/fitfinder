"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LaunchOverlayFrame } from "@/components/launch-overlay-frame";
import { WelcomeHeroIllustration } from "@/components/welcome-hero-illustration";
import { markWelcomeComplete, markLaunchFlowComplete, markAppSessionActive } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";

interface WelcomeScreenProps {
  onExit: (target: string) => void;
}

export function WelcomeScreen({ onExit }: WelcomeScreenProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"guest" | "account" | null>(null);

  async function handleCreateAccount() {
    setBusy("account");
    markWelcomeComplete();
    onExit("/signup");
    router.push("/signup");
  }

  async function handleContinueAsGuest() {
    setBusy("guest");
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      toast.error(error.message);
      setBusy(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Could not start guest session. Try again.");
      setBusy(null);
      return;
    }

    markWelcomeComplete();
    markLaunchFlowComplete();
    markAppSessionActive();
    onExit("/home");

    if (isNativePlatform()) {
      router.push("/home");
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <LaunchOverlayFrame className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
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
              className="h-12 w-full rounded-xl text-[17px]"
              disabled={busy !== null}
              onClick={() => void handleCreateAccount()}
            >
              {busy === "account" ? "Opening…" : "Sign up"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl text-[17px]"
              disabled={busy !== null}
              onClick={() => void handleContinueAsGuest()}
            >
              {busy === "guest" ? "Starting…" : "Use as a guest"}
            </Button>
          </div>
        </div>
      </div>
    </LaunchOverlayFrame>
  );
}
