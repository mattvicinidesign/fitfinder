"use client";

import { useMemo, useState } from "react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createPreferenceSteps } from "@/components/onboarding/preference-steps";
import { createClient } from "@/lib/supabase/client";
import { isNativePlatform } from "@/lib/platform";
import { emptyUserProfile, type UserProfile } from "@/lib/profile";
import { savePendingSignup, SIGNUP_COMPLETE_ROUTE } from "@/lib/pending-signup";
import { getSignupQaDefaults } from "@/lib/signup-qa";
import { toast } from "sonner";

const fieldInputClassName =
  "h-11 text-[17px] bg-transparent border-0 shadow-none px-0 focus-visible:ring-0";

function AccountField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldInputClassName}
      />
    </div>
  );
}

function EmailSentState({ email }: { email: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          Check your email
        </h1>
        <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted-foreground">
          We sent a sign-up link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Open it
          to finish creating your account — your preferences are saved and ready
          to go.
        </p>
      </div>
    </div>
  );
}

export function SignUpScreen() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const qaDefaults = getSignupQaDefaults();
    return {
      ...emptyUserProfile(),
      ...(qaDefaults
        ? { fullName: qaDefaults.fullName, country: qaDefaults.location }
        : {}),
    };
  });
  const [email, setEmail] = useState(() => getSignupQaDefaults()?.email ?? "");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function patch(next: Partial<UserProfile>) {
    setProfile((current) => ({ ...current, ...next }));
  }

  const preferenceSteps = useMemo(
    () => createPreferenceSteps(profile, patch),
    [profile],
  );

  const steps = useMemo(
    () => [
      {
        title: "Create your account",
        subtitle: "We'll email you a link to sign in — no password needed.",
        content: (
          <IosGroupedSection title="Your details">
            <IosGroupedRow>
              <AccountField
                id="signup-name"
                label="Name"
                placeholder="Your name"
                value={profile.fullName ?? ""}
                onChange={(value) => patch({ fullName: value })}
              />
            </IosGroupedRow>
            <IosGroupedRow>
              <AccountField
                id="signup-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
              />
            </IosGroupedRow>
            <IosGroupedRow>
              <AccountField
                id="signup-location"
                label="Location"
                placeholder="City, country"
                value={profile.country ?? ""}
                onChange={(value) => patch({ country: value })}
              />
            </IosGroupedRow>
          </IosGroupedSection>
        ),
      },
      ...preferenceSteps,
    ],
    [email, preferenceSteps, profile.country, profile.fullName],
  );

  function validateAccountStep(): boolean {
    const name = profile.fullName?.trim();
    const trimmedEmail = email.trim();
    const location = profile.country?.trim();

    if (!name) {
      toast.error("Enter your name to continue.");
      return false;
    }
    if (!trimmedEmail) {
      toast.error("Enter your email to continue.");
      return false;
    }
    if (!location) {
      toast.error("Enter your location to continue.");
      return false;
    }
    return true;
  }

  function handleStepChange(nextStep: number) {
    if (step === 0 && nextStep > 0 && !validateAccountStep()) return;
    setStep(nextStep);
  }

  async function finishSignUp() {
    if (!validateAccountStep()) {
      setStep(0);
      return;
    }

    const trimmedEmail = email.trim();
    const signupProfile: UserProfile = {
      ...profile,
      fullName: profile.fullName?.trim() || null,
      country: profile.country?.trim() || null,
    };

    setBusy(true);
    savePendingSignup({ email: trimmedEmail, profile: signupProfile });

    const supabase = createClient();
    const redirectBase = isNativePlatform()
      ? "fitfinder://auth-callback"
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${redirectBase}?next=${encodeURIComponent(SIGNUP_COMPLETE_ROUTE)}`,
        data: {
          full_name: signupProfile.fullName,
          location: signupProfile.country,
        },
      },
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmailSent(true);
  }

  return (
    <AppFrame>
      {emailSent ? (
        <EmailSentState email={email.trim()} />
      ) : (
        <OnboardingWizard
          steps={steps}
          step={step}
          onStepChange={handleStepChange}
          onFinish={() => void finishSignUp()}
          busy={busy}
          finishLabel="Sign up with email"
          busyLabel="Sending…"
          continueLabel="Continue"
        />
      )}
    </AppFrame>
  );
}
