"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppFrame } from "@/components/app-shell/app-frame";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createPreferenceSteps } from "@/components/onboarding/preference-steps";
import {
  emptyUserProfile,
  fetchUserProfile,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";

export function OnboardingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const existing = await fetchUserProfile();
      if (existing) setProfile(existing);
      setLoading(false);
    })();
  }, []);

  function patch(next: Partial<UserProfile>) {
    setProfile((current) => ({ ...current, ...next }));
  }

  const steps = useMemo(
    () => createPreferenceSteps(profile, patch),
    [profile],
  );

  async function finish() {
    setBusy(true);
    const { error } = await saveUserProfile(profile, { markComplete: true });
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
        loading={loading}
      />
    </AppFrame>
  );
}
