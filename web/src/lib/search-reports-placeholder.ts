import { loadOnboardingProgress } from "@/lib/onboarding-progress";
import { loadPendingSignup } from "@/lib/pending-signup";
import { loadProfileHeaderSnapshot } from "@/lib/profile";

const FALLBACK_PLACEHOLDER = "Search Reports";

export function searchReportsPlaceholderText(
  displayName?: string | null,
): string {
  const name = displayName?.trim();
  if (!name) return FALLBACK_PLACEHOLDER;
  return `Search ${name}'s Fit Reports`;
}

/** Sync read from profile cache and local signup/onboarding drafts. */
export function resolveSearchReportsPlaceholderText(): string {
  const snapshotName = loadProfileHeaderSnapshot()?.fullName?.trim();
  if (snapshotName) return searchReportsPlaceholderText(snapshotName);

  const pendingName = loadPendingSignup()?.profile.fullName?.trim();
  if (pendingName) return searchReportsPlaceholderText(pendingName);

  const progressName = loadOnboardingProgress()?.profile.fullName?.trim();
  if (progressName) return searchReportsPlaceholderText(progressName);

  return FALLBACK_PLACEHOLDER;
}
