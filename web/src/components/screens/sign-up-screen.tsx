"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { CheckEmailIllustration } from "@/components/check-email-illustration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELD_INPUT_BORDERLESS_CLASS,
  FORM_FIELDS_SECTION_GAP_CLASS,
} from "@/components/form-field-styles";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  createIntentSteps,
  createResumeUploadStep,
} from "@/components/onboarding/preference-steps";
import { LocationSelect } from "@/components/location-select";
import { TimezoneSelect } from "@/components/timezone-select";
import {
  markAuthDeepLinkPending,
  markLaunchFlowComplete,
  markWelcomeComplete,
} from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";
import { emptyUserProfile, saveUserProfile, type UserProfile } from "@/lib/profile";
import { savePendingSignup, SIGNUP_COMPLETE_ROUTE } from "@/lib/pending-signup";
import { ensureGuestSession } from "@/lib/ensure-guest-session";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import {
  loadOnboardingProgress,
  saveOnboardingProgress,
} from "@/lib/onboarding-progress";
import { sendSignupVerificationEmail } from "@/lib/signup-auth";
import {
  canContinueSignupStep,
  firstIncompleteSignupStep,
  isSignupGeneralDetailsComplete,
  SIGNUP_COMPLETION_STEP_INDEX,
  SIGNUP_GOALS_STEP_INDEX,
  SIGNUP_HELP_STEP_INDEX,
  SIGNUP_RESUME_STEP_INDEX,
  SIGNUP_SEARCH_STAGE_STEP_INDEX,
} from "@/lib/signup-flow";
import { guessProfileTimezone } from "@/lib/timezone-options";
import { safeBottomOverlay, safeTopHomeHero } from "@/lib/safe-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
        className={FORM_FIELD_INPUT_BORDERLESS_CLASS}
      />
    </div>
  );
}

function CompletionChecklist({
  resumeUploaded,
}: {
  resumeUploaded: boolean;
}) {
  const items = [
    { label: "Resume uploaded", done: resumeUploaded },
    { label: "Preferences saved", done: true },
    { label: "Ready to verify your email", done: true },
  ];

  return (
    <ul className="mt-2 space-y-3">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3.5",
            item.done
              ? "border-primary/40 bg-primary/10"
              : "border-border/60 bg-muted/40",
          )}
        >
          <CheckCircle2
            className={cn(
              "size-5 shrink-0",
              item.done ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "text-[16px] font-medium",
              item.done ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmailSentState({ email }: { email: string }) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col px-6 ${safeBottomOverlay} ${safeTopHomeHero}`}
    >
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

  if (saved?.phase === "signup" && saved.emailSent && saved.email.trim()) {
    return {
      profile: { ...baseProfile, ...saved.profile },
      email: saved.email,
      step: SIGNUP_COMPLETION_STEP_INDEX,
      emailSent: true,
      isFreshSignup: false,
    };
  }

  if (saved?.phase === "signup" && !saved.emailSent) {
    return {
      profile: { ...baseProfile, ...saved.profile },
      email: saved.email || "",
      step: Math.min(saved.signupStep ?? 0, SIGNUP_COMPLETION_STEP_INDEX),
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
  const [initial] = useState(readInitialSignupState);
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

  const steps = useMemo(
    () => [
      {
        title: "Basic Information",
        subtitle:
          "Used only for your account and localization. None of this affects your job match scores.",
        content: (
          <div className={cn("flex flex-col", FORM_FIELDS_SECTION_GAP_CLASS)}>
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
              label="Country"
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
      ...createIntentSteps(profile, patch),
      {
        title: "You're all set",
        subtitle:
          "Tap below and we'll email you a link to finish creating your account.",
        content: (
          <CompletionChecklist resumeUploaded={Boolean(resumeFileName)} />
        ),
      },
    ],
    [email, handleResumeParsed, profile, resumeFileName],
  );

  const canContinue =
    canContinueSignupStep(step, profile, email) && !resumeBusy && !busy;

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

  function validateIntentStep(stepIndex: number): boolean {
    if (stepIndex === SIGNUP_GOALS_STEP_INDEX) {
      toast.error("Select at least one goal to continue.");
      return false;
    }
    if (stepIndex === SIGNUP_SEARCH_STAGE_STEP_INDEX) {
      toast.error("Select where you are in your search to continue.");
      return false;
    }
    if (stepIndex === SIGNUP_HELP_STEP_INDEX) {
      toast.error("Select at least one area you'd like help with.");
      return false;
    }
    return false;
  }

  async function finishSignUp() {
    const incompleteStep = firstIncompleteSignupStep(profile, email);
    if (incompleteStep !== null) {
      setStep(incompleteStep);
      if (incompleteStep === 0) validateAccountStep();
      else validateIntentStep(incompleteStep);
      return;
    }

    const trimmedEmail = email.trim();
    const signupProfile: UserProfile = {
      ...profile,
      fullName: profile.fullName?.trim() || null,
      country: profile.country?.trim() || null,
      searchStage: profile.searchStage?.trim() || null,
    };

    setBusy(true);
    markLaunchFlowComplete();
    savePendingSignup({ email: trimmedEmail, profile: signupProfile });

    // Best-effort persist for the guest session (intent fields included).
    void saveUserProfile(signupProfile, { markComplete: true });

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
    setEmailSent(true);
    persistProgress({
      emailSent: true,
      signupStep: SIGNUP_COMPLETION_STEP_INDEX,
      email: trimmedEmail,
      profile: signupProfile,
    });
  }

  function handleStepChange(nextStep: number) {
    if (nextStep > step && !canContinueSignupStep(step, profile, email)) {
      if (step === 0) validateAccountStep();
      else validateIntentStep(step);
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

  const continueLabel =
    step === SIGNUP_RESUME_STEP_INDEX && !resumeFileName ? "Skip" : "Continue";

  const wizard = emailSent ? (
    <EmailSentState email={email.trim()} />
  ) : (
    <OnboardingWizard
      steps={steps}
      step={step}
      onStepChange={handleStepChange}
      onFinish={() => void finishSignUp()}
      onBackFromStart={embedded && step === 0 ? onBackToWelcome : undefined}
      busy={busy}
      canContinue={canContinue}
      finishLabel="Sign up with email"
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
