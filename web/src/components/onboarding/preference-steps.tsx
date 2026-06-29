import { ChipMultiSelect } from "@/components/ui/chip-multi-select";
import { EmployerRatingSlider } from "@/components/employer-rating-slider";
import { MinimumHourlyRateSlider } from "@/components/minimum-hourly-rate-slider";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import {
  COMPANY_TYPE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/onboarding-options";
import type { UserProfile } from "@/lib/profile";
import type { OnboardingStep } from "@/components/onboarding/onboarding-wizard";

export function createResumeUploadStep(input: {
  fileName: string | null;
  onParsed: (payload: { resumeId: string; fileName: string }) => void;
  onBusyChange?: (busy: boolean) => void;
}): OnboardingStep {
  return {
    title: "Upload your resume",
    subtitle:
      "We'll use it to score job fit on every analysis. You can skip and add one later.",
    content: (
      <ResumeFilePicker
        className="min-h-[180px]"
        fileName={input.fileName}
        onParsed={input.onParsed}
        onBusyChange={input.onBusyChange}
      />
    ),
  };
}

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
      subtitle: "Feeds location fit on reports.",
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
