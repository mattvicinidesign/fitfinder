import { hasCompletedWelcome } from "@/lib/app-session";
import { emptyUserProfile, type UserProfile } from "@/lib/profile";

export const ONBOARDING_PROGRESS_KEY = "fitfinder-onboarding-progress";

export type OnboardingPhase = "welcome" | "signup";

export interface OnboardingProgress {
  phase: OnboardingPhase;
  signupStep: number;
  emailSent: boolean;
  email: string;
  profile: UserProfile;
}

export type PostSplashDestination = "welcome" | "signup" | "home";

function canUseLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function defaultProgress(): OnboardingProgress {
  return {
    phase: "welcome",
    signupStep: 0,
    emailSent: false,
    email: "",
    profile: emptyUserProfile(),
  };
}

export function loadOnboardingProgress(): OnboardingProgress | null {
  if (!canUseLocalStorage()) return null;
  const raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (parsed.phase !== "welcome" && parsed.phase !== "signup") return null;
    return {
      phase: parsed.phase,
      signupStep:
        typeof parsed.signupStep === "number" ? parsed.signupStep : 0,
      emailSent: parsed.emailSent === true,
      email: typeof parsed.email === "string" ? parsed.email : "",
      profile: {
        ...emptyUserProfile(),
        ...(parsed.profile ?? {}),
      },
    };
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(
  progress: Partial<OnboardingProgress> & Pick<OnboardingProgress, "phase">,
): void {
  if (!canUseLocalStorage()) return;
  const current = loadOnboardingProgress() ?? defaultProgress();
  const next: OnboardingProgress = {
    ...current,
    ...progress,
    profile: progress.profile
      ? { ...current.profile, ...progress.profile }
      : current.profile,
  };
  localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(next));
}

export function clearOnboardingProgress(): void {
  if (!canUseLocalStorage()) return;
  localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
}

/** Signup started but not yet verified — resume on cold start, including OTP entry. */
export function hasInProgressSignup(): boolean {
  const progress = loadOnboardingProgress();
  return progress?.phase === "signup";
}

/** Step 1 = General Details (signup wizard step 0 completed). */
export function hasCompletedOnboardingStep1(): boolean {
  const progress = loadOnboardingProgress();
  return (
    progress?.phase === "signup" &&
    (progress.signupStep >= 1 || progress.emailSent)
  );
}

export function shouldResumeSignupWizard(): boolean {
  return hasInProgressSignup();
}

export function markOnboardingWelcomeRestored(): void {
  clearOnboardingProgress();
}

export function resolvePostSplashDestination(
  signupFlowRequested: boolean,
): PostSplashDestination {
  if (hasInProgressSignup()) {
    return "signup";
  }

  if (hasCompletedWelcome()) {
    return signupFlowRequested ? "signup" : "home";
  }

  if (signupFlowRequested) {
    return "signup";
  }

  return "welcome";
}
