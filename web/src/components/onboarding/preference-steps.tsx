import { ChipMultiSelect } from "@/components/ui/chip-multi-select";
import { EmployerRatingSlider } from "@/components/employer-rating-slider";
import { MinimumHourlyRateSlider } from "@/components/minimum-hourly-rate-slider";
import {
  COMPANY_TYPE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/onboarding-options";
import type { UserProfile } from "@/lib/profile";
import type { OnboardingStep } from "@/components/onboarding/onboarding-wizard";

export function createPreferenceSteps(
  profile: UserProfile,
  patch: (next: Partial<UserProfile>) => void,
): OnboardingStep[] {
  return [
    {
      title: "What is your minimum hourly rate?",
      subtitle: "We flag jobs that pay below your floor.",
      content: (
        <MinimumHourlyRateSlider
          value={profile.minimumHourlyRate}
          onChange={(minimumHourlyRate) => patch({ minimumHourlyRate })}
        />
      ),
    },
    {
      title: "What types of employers do you prefer?",
      subtitle: "Feeds client fit and employer-type alignment.",
      content: (
        <ChipMultiSelect
          options={COMPANY_TYPE_OPTIONS}
          value={profile.preferredCompanyTypes}
          onChange={(v) => patch({ preferredCompanyTypes: v })}
        />
      ),
    },
    {
      title: "What's the minimum client rating you'll consider?",
      subtitle: "Jobs at or above this rating show as a match on the report.",
      content: (
        <EmployerRatingSlider
          value={profile.preferredMinimumEmployerRating}
          onChange={(preferredMinimumEmployerRating) =>
            patch({ preferredMinimumEmployerRating })
          }
        />
      ),
    },
    {
      title: "What project types do you prefer?",
      subtitle: "Ongoing retainer work vs one-time projects.",
      content: (
        <ChipMultiSelect
          options={PROJECT_TYPE_OPTIONS}
          value={profile.preferredProjectTypes}
          onChange={(v) => patch({ preferredProjectTypes: v })}
        />
      ),
    },
    {
      title: "Which regions are you open to?",
      subtitle: "Feeds location and time-zone alignment.",
      content: (
        <ChipMultiSelect
          options={REGION_OPTIONS}
          value={profile.preferredRegions}
          onChange={(v) => patch({ preferredRegions: v })}
        />
      ),
    },
  ];
}
