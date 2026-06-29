"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppFrame } from "@/components/app-shell/app-frame";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  createPreferenceSteps,
  createResumeUploadStep,
} from "@/components/onboarding/preference-steps";
import {
  emptyUserProfile,
  fetchUserProfile,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import { guessProfileTimezone } from "@/lib/timezone-options";

export function OnboardingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile());
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [existing, latestResume] = await Promise.all([
        fetchUserProfile(),
        fetchLatestUserResume(),
      ]);
      const guessed = guessProfileTimezone();
      const base = existing ?? emptyUserProfile();
      setProfile(
        base.timezone || !guessed
          ? base
          : { ...base, timezone: guessed },
      );
      if (latestResume) setResumeFileName(latestResume.fileName);
      setLoading(false);
    })();
  }, []);

  function patch(next: Partial<UserProfile>) {
    setProfile((current) => ({ ...current, ...next }));
  }

  const handleResumeParsed = useCallback(
    ({ fileName }: { resumeId: string; fileName: string }) => {
      setResumeFileName(fileName);
      setStep((current) => (current === 0 ? 1 : current));
    },
    [],
  );

  const steps = useMemo(
    () => [
      createResumeUploadStep({
        fileName: resumeFileName,
        onParsed: handleResumeParsed,
        onBusyChange: setResumeBusy,
      }),
      ...createPreferenceSteps(profile, patch),
    ],
    [handleResumeParsed, profile, resumeFileName],
  );

  async function finish() {
    const timezone = profile.timezone?.trim() || guessProfileTimezone();
    if (!timezone) {
      toast.error("Set your timezone under Profile → Settings to continue.");
      return;
    }

    const toSave = profile.timezone?.trim()
      ? profile
      : { ...profile, timezone };

    setBusy(true);
    const { error } = await saveUserProfile(toSave, { markComplete: true });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Profile saved — recommendations are now personalized.");
    router.push("/home");
  }

  function skip() {
    router.push("/home");
  }

  return (
    <AppFrame>
      <OnboardingWizard
        steps={steps}
        step={step}
        onStepChange={setStep}
        onFinish={() => void finish()}
        onSkip={skip}
        busy={busy}
        canContinue={!resumeBusy}
        loading={loading}
      />
    </AppFrame>
  );
}
