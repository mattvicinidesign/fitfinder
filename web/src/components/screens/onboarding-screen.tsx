"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppFrame } from "@/components/app-shell/app-frame";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  createIntentSteps,
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
import {
  canContinueSignupStep,
  isSignupGoalsComplete,
  isSignupHelpTopicsComplete,
  isSignupSearchStageComplete,
  SIGNUP_GOALS_STEP_INDEX,
  SIGNUP_HELP_STEP_INDEX,
  SIGNUP_RESUME_STEP_INDEX,
  SIGNUP_SEARCH_STAGE_STEP_INDEX,
} from "@/lib/signup-flow";

/**
 * Post-auth onboarding for accounts that still need intent + resume.
 * Matching preferences (rate / employer / regions) are edited on Profile only.
 */
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
      ...createIntentSteps(profile, patch),
    ],
    [handleResumeParsed, profile, resumeFileName],
  );

  // Map wizard indexes (resume=0) onto signup-flow indexes (resume=1).
  const signupFlowStep = step + SIGNUP_RESUME_STEP_INDEX;

  function firstIncompleteIntentWizardStep(): number | null {
    if (!isSignupGoalsComplete(profile)) return SIGNUP_GOALS_STEP_INDEX - 1;
    if (!isSignupSearchStageComplete(profile)) {
      return SIGNUP_SEARCH_STAGE_STEP_INDEX - 1;
    }
    if (!isSignupHelpTopicsComplete(profile)) return SIGNUP_HELP_STEP_INDEX - 1;
    return null;
  }

  async function finish() {
    const incomplete = firstIncompleteIntentWizardStep();
    if (incomplete !== null) {
      setStep(incomplete);
      if (incomplete === SIGNUP_GOALS_STEP_INDEX - 1) {
        toast.error("Select at least one goal to continue.");
      } else if (incomplete === SIGNUP_SEARCH_STAGE_STEP_INDEX - 1) {
        toast.error("Select where you are in your search to continue.");
      } else {
        toast.error("Select at least one area you'd like help with.");
      }
      return;
    }

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
    toast.success("You're all set — ready for your first analysis.");
    router.push("/analyze");
  }

  function skip() {
    router.push("/home");
  }

  function handleStepChange(nextStep: number) {
    if (
      nextStep > step &&
      !canContinueSignupStep(signupFlowStep, profile, "onboarding@local")
    ) {
      if (signupFlowStep === SIGNUP_GOALS_STEP_INDEX) {
        toast.error("Select at least one goal to continue.");
      } else if (signupFlowStep === SIGNUP_SEARCH_STAGE_STEP_INDEX) {
        toast.error("Select where you are in your search to continue.");
      } else if (signupFlowStep === SIGNUP_HELP_STEP_INDEX) {
        toast.error("Select at least one area you'd like help with.");
      }
      return;
    }
    setStep(nextStep);
  }

  return (
    <AppFrame>
      <OnboardingWizard
        steps={steps}
        step={step}
        onStepChange={handleStepChange}
        onFinish={() => void finish()}
        onSkip={skip}
        busy={busy}
        canContinue={
          canContinueSignupStep(signupFlowStep, profile, "onboarding@local") &&
          !resumeBusy
        }
        loading={loading}
        continueLabel={
          step === SIGNUP_RESUME_STEP_INDEX - 1 && !resumeFileName
            ? "Skip"
            : "Continue"
        }
        finishLabel="Start First Analysis"
      />
    </AppFrame>
  );
}
