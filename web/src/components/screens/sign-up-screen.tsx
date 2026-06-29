"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELD_CONTROL_TEXT_CLASS,
} from "@/components/form-field-styles";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  createPreferenceSteps,
  createResumeUploadStep,
} from "@/components/onboarding/preference-steps";
import { CheckEmailIllustration } from "@/components/check-email-illustration";
import { LocationSelect } from "@/components/location-select";
import { TimezoneSelect } from "@/components/timezone-select";
import { markAuthDeepLinkPending } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";
import { emptyUserProfile, type UserProfile } from "@/lib/profile";
import { savePendingSignup, SIGNUP_COMPLETE_ROUTE } from "@/lib/pending-signup";
import { ensureGuestSession } from "@/lib/ensure-guest-session";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import {
  markLaunchFlowComplete,
  markWelcomeComplete,
} from "@/lib/app-session";
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
} from "@/lib/onboarding-progress";
import { sendSignupVerificationEmail } from "@/lib/signup-auth";
import {
  canContinueSignupStep,
  firstIncompleteSignupStep,
  isSignupGeneralDetailsComplete,
} from "@/lib/signup-flow";
import { guessProfileTimezone } from "@/lib/timezone-options";
import { safeBottomOverlay, safeTopHomeHero } from "@/lib/safe-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fieldInputClassName = cn(
  "h-11 px-3.5 bg-transparent border-0 shadow-none focus-visible:ring-0",
  FORM_FIELD_CONTROL_TEXT_CLASS,
);

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
  const saved = loadOnboardingProgress();
  const baseProfile = emptyUserProfile();

  if (saved?.phase === "signup" && !saved.emailSent) {
    return {
      profile: { ...baseProfile, ...saved.profile },
      email: saved.email || "",
      step: saved.signupStep ?? 0,
      emailSent: false,
      isFreshSignup: false,
    };
  }

  return {
    profile: baseProfile,
    email: "",
    step: 0,
    emailSent: false,
    isFreshSignup: true,
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
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
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
    saveOnboardingProgress({
      phase: "signup",
      ...next,
    });
  }

  function patch(next: Partial<UserProfile>) {
    setProfile((current) => {
      const merged = { ...current, ...next };
      persistProgress({ profile: merged });
      return merged;
    });
  }

  const handleResumeParsed = useCallback(
    ({ fileName }: { resumeId: string; fileName: string }) => {
      setResumeFileName(fileName);
    },
    [],
  );

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
                persistProgress({ email: value });
              }}
            />
            <LocationSelect
              id="signup-location"
              value={profile.country}
              onChange={(value) => patch({ country: value })}
            />
            <TimezoneSelect
              id="signup-timezone"
              value={profile.timezone}
              onChange={(value) => patch({ timezone: value })}
            />
          </div>
        ),
      },
      createResumeUploadStep({
        fileName: resumeFileName,
        onParsed: handleResumeParsed,
        onBusyChange: setResumeBusy,
      }),
      ...preferenceSteps,
    ],
    [
      email,
      handleResumeParsed,
      preferenceSteps,
      profile.country,
      profile.fullName,
      profile.timezone,
      profile.preferredCompanyTypes,
      profile.preferredProjectTypes,
      profile.preferredRegions,
      resumeFileName,
      step,
    ],
  );

  const canContinue =
    !resumeBusy && canContinueSignupStep(step, profile, email);

  function validateAccountStep(): boolean {
    if (isSignupGeneralDetailsComplete(profile, email)) return true;
    if (!profile.fullName?.trim()) {
      toast.error("Enter your name to continue.");
      return false;
    }
    if (!email.trim()) {
      toast.error("Enter your email to continue.");
      return false;
    }
    if (!profile.country?.trim()) {
      toast.error("Select your location to continue.");
      return false;
    }
    toast.error("Select your timezone to continue.");
    return false;
  }

  function handleStepChange(nextStep: number) {
    if (nextStep > step && !canContinueSignupStep(step, profile, email)) {
      if (step === 0) {
        validateAccountStep();
      } else if (step === 3) {
        toast.error("Select at least one employer type to continue.");
      } else if (step === 5) {
        toast.error("Select at least one project type to continue.");
      } else if (step === 6) {
        toast.error("Select at least one region to continue.");
      }
      return;
    }
    setStep(nextStep);
    persistProgress({ signupStep: nextStep });
  }

  useEffect(() => {
    void (async () => {
      const { error } = await ensureGuestSession({ deferLaunchCompletion: true });
      if (error) return;
      const latestResume = await fetchLatestUserResume();
      if (latestResume) setResumeFileName(latestResume.fileName);
    })();
  }, []);

  useEffect(() => {
    if (initial.isFreshSignup) return;
    const guessed = guessProfileTimezone();
    if (!guessed) return;
    setProfile((current) =>
      current.timezone ? current : { ...current, timezone: guessed },
    );
  }, [initial.isFreshSignup]);

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
    const incompleteStep = firstIncompleteSignupStep(profile, email);
    if (incompleteStep !== null) {
      setStep(incompleteStep);
      if (incompleteStep === 0) validateAccountStep();
      else if (incompleteStep === 3) {
        toast.error("Select at least one employer type to continue.");
      } else if (incompleteStep === 5) {
        toast.error("Select at least one project type to continue.");
      } else if (incompleteStep === 6) {
        toast.error("Select at least one region to continue.");
      }
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
    const { error } = await sendSignupVerificationEmail({
      email: trimmedEmail,
      profile: signupProfile,
      redirectNext: SIGNUP_COMPLETE_ROUTE,
    });
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    markWelcomeComplete();
    clearOnboardingProgress();
    setEmailSent(true);
    persistProgress({ emailSent: true });
  }

  const resumeStepIndex = 1;
  const continueLabel =
    step === resumeStepIndex && !resumeFileName ? "Skip" : "Continue";

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
      canContinue={canContinue}
      finishLabel="Sign Up"
      busyLabel="Sending…"
      continueLabel={continueLabel}
      compactTopInset={embedded}
    />
  );

  if (embedded) {
    return wizard;
  }

  return <AppFrame>{wizard}</AppFrame>;
}
