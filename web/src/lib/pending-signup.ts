import { createClient } from "@/lib/supabase/client";
import { loadOnboardingProgress } from "@/lib/onboarding-progress";
import {
  emptyUserProfile,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";

export const PENDING_SIGNUP_KEY = "fitfinder-pending-signup";
export const SIGNUP_COMPLETE_ROUTE = "/home";

export interface PendingSignup {
  email: string;
  profile: UserProfile;
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function savePendingSignup(data: PendingSignup): void {
  const json = JSON.stringify(data);
  if (canUseLocalStorage()) {
    localStorage.setItem(PENDING_SIGNUP_KEY, json);
  }
  if (canUseSessionStorage()) {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, json);
  }
}

export function loadPendingSignup(): PendingSignup | null {
  const raw =
    (canUseLocalStorage() ? localStorage.getItem(PENDING_SIGNUP_KEY) : null) ??
    (canUseSessionStorage() ? sessionStorage.getItem(PENDING_SIGNUP_KEY) : null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingSignup>;
    if (typeof parsed.email !== "string" || !parsed.profile) return null;
    return parsed as PendingSignup;
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  if (canUseLocalStorage()) localStorage.removeItem(PENDING_SIGNUP_KEY);
  if (canUseSessionStorage()) sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}

function resolvePendingSignupProfile(): PendingSignup | null {
  const pending = loadPendingSignup();
  if (pending) return pending;

  const progress = loadOnboardingProgress();
  if (!progress?.email.trim() || !progress.profile.fullName?.trim()) {
    return null;
  }

  return {
    email: progress.email.trim(),
    profile: { ...emptyUserProfile(), ...progress.profile },
  };
}

function profileFromAuthMetadata(
  metadata: Record<string, unknown> | undefined,
): UserProfile | null {
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  if (!fullName) return null;

  const country =
    typeof metadata?.location === "string" ? metadata.location.trim() : null;

  return {
    ...emptyUserProfile(),
    fullName,
    country: country || null,
  };
}

/** Apply sign-up profile collected before auth, including onboarding preferences. */
export async function applyPendingSignupProfile(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const pending = resolvePendingSignupProfile();
  const profile =
    pending?.profile ??
    profileFromAuthMetadata(user.user_metadata as Record<string, unknown>);
  if (!profile) return;

  const { error } = await saveUserProfile(profile, { markComplete: true });
  if (!error) clearPendingSignup();
}
