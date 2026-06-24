"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
} from "@/components/form-field-styles";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createPreferenceSteps } from "@/components/onboarding/preference-steps";
import { CheckEmailIllustration } from "@/components/check-email-illustration";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackRedirectUrl } from "@/lib/auth-redirect";
import { markAuthDeepLinkPending } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";
import { emptyUserProfile, type UserProfile } from "@/lib/profile";
import { savePendingSignup, SIGNUP_COMPLETE_ROUTE } from "@/lib/pending-signup";
import {
  markLaunchFlowComplete,
  markWelcomeComplete,
} from "@/lib/app-session";
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  markOnboardingWelcomeRestored,
  saveOnboardingProgress,
} from "@/lib/onboarding-progress";
import { getSignupQaDefaults } from "@/lib/signup-qa";
import { safeBottomOverlay, safeTopHomeHero } from "@/lib/safe-area";
import { toast } from "sonner";

const fieldInputClassName =
  "h-11 text-[17px] px-3.5 bg-transparent border-0 shadow-none focus-visible:ring-0";

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
    <div className={FORM_FIELD_GROUP_CLASS}>
      <Label htmlFor={id} className={FORM_FIELD_LABEL_CLASS}>
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
    <div className={`flex h-full min-h-0 flex-col px-6 ${safeBottomOverlay} ${safeTopHomeHero}`}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-[160px] w-[260px] max-w-full items-center justify-center sm:h-[180px]">
          <CheckEmailIllustration />
        </div>

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

function readInitialSignupState() {
  const qaDefaults = getSignupQaDefaults();
  const saved = loadOnboardingProgress();
  const baseProfile = {
    ...emptyUserProfile(),
    ...(qaDefaults
      ? { fullName: qaDefaults.fullName, country: qaDefaults.location }
      : {}),
  };

  if (saved?.phase === "signup" && saved.signupStep >= 1) {
    return {
      profile: { ...baseProfile, ...saved.profile },
      email: saved.email || qaDefaults?.email || "",
      step: saved.signupStep,
      emailSent: saved.emailSent,
    };
  }

  return {
    profile: baseProfile,
    email: qaDefaults?.email ?? "",
    step: 0,
    emailSent: false,
  };
}

export function SignUpScreen({
  embedded = false,
  onBackToWelcome,
}: {
  embedded?: boolean;
  onBackToWelcome?: () => void;
} = {}) {
  const initial = readInitialSignupState();
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [email, setEmail] = useState(initial.email);
  const [step, setStep] = useState(initial.step);
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(initial.emailSent);
  const progressRef = useRef({
    signupStep: initial.step,
    email: initial.email,
    emailSent: initial.emailSent,
    profile: initial.profile,
  });

  function persistProgress(
    updates: Partial<{
      signupStep: number;
      emailSent: boolean;
      email: string;
      profile: UserProfile;
    }>,
  ) {
    const next = {
      signupStep: updates.signupStep ?? progressRef.current.signupStep,
      emailSent: updates.emailSent ?? progressRef.current.emailSent,
      email: updates.email ?? progressRef.current.email,
      profile: updates.profile ?? progressRef.current.profile,
    };
    progressRef.current = next;
    if (next.signupStep < 1 && !next.emailSent) return;

    saveOnboardingProgress({
      phase: "signup",
      ...next,
    });
  }

  function patch(next: Partial<UserProfile>) {
    setProfile((current) => {
      const merged = { ...current, ...next };
      if (step >= 1) persistProgress({ profile: merged });
      return merged;
    });
  }

  const preferenceSteps = useMemo(
    () => createPreferenceSteps(profile, patch),
    [profile],
  );

  const steps = useMemo(
    () => [
      {
        title: "General Details",
        content: (
          <div className="space-y-4">
            <AccountField
              id="signup-name"
              label="Name"
              placeholder="Your name"
              value={profile.fullName ?? ""}
              onChange={(value) => patch({ fullName: value })}
            />
            <AccountField
              id="signup-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(value) => {
                setEmail(value);
                if (step >= 1) persistProgress({ email: value });
              }}
            />
            <AccountField
              id="signup-location"
              label="Location"
              placeholder="City, country"
              value={profile.country ?? ""}
              onChange={(value) => patch({ country: value })}
            />
          </div>
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
    if (nextStep >= 1) {
      persistProgress({ signupStep: nextStep });
    } else {
      markOnboardingWelcomeRestored();
    }
  }

  useEffect(() => {
    progressRef.current = {
      signupStep: step,
      email,
      emailSent,
      profile,
    };
  }, [step, email, emailSent, profile]);

  useEffect(() => {
    if (!embedded) return;

    let remove: (() => void) | undefined;

    void (async () => {
      if (!isNativePlatform()) return;
      try {
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) return;
          if (progressRef.current.signupStep < 1) return;
          saveOnboardingProgress({
            phase: "signup",
            signupStep: progressRef.current.signupStep,
            emailSent: progressRef.current.emailSent,
            email: progressRef.current.email,
            profile: progressRef.current.profile,
          });
        });
        remove = () => sub.remove();
      } catch {
        // Web-only dev without native plugins.
      }
    })();

    return () => remove?.();
  }, [embedded]);

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
    markLaunchFlowComplete();
    savePendingSignup({ email: trimmedEmail, profile: signupProfile });

    markAuthDeepLinkPending();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: getAuthCallbackRedirectUrl(SIGNUP_COMPLETE_ROUTE),
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

    markWelcomeComplete();
    clearOnboardingProgress();
    setEmailSent(true);
    persistProgress({ emailSent: true });
  }

  const wizard = emailSent ? (
    <EmailSentState email={email.trim()} />
  ) : (
    <OnboardingWizard
      steps={steps}
      step={step}
      onStepChange={handleStepChange}
      onFinish={() => void finishSignUp()}
      onBackFromStart={embedded ? onBackToWelcome : undefined}
      busy={busy}
      finishLabel="Sign up with email"
      busyLabel="Sending…"
      continueLabel="Continue"
    />
  );

  if (embedded) {
    return wizard;
  }

  return <AppFrame>{wizard}</AppFrame>;
}
