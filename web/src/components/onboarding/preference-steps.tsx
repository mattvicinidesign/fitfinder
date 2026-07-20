import {
  OptionCardMultiSelect,
  OptionCardSingleSelect,
} from "@/components/ui/option-card-select";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import {
  HELP_TOPIC_OPTIONS,
  JOB_SEARCH_GOAL_OPTIONS,
  SEARCH_STAGE_OPTIONS,
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
      "Upload your primary resume. We'll use it for every analysis. You can replace it anytime.",
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

/**
 * Signup Steps 3–5 — personalization / analytics only.
 * Never wire these into the job-fit matching algorithm.
 */
export function createIntentSteps(
  profile: UserProfile,
  patch: (next: Partial<UserProfile>) => void,
): OnboardingStep[] {
  return [
    {
      title: "What brings you to OnlyFit?",
      subtitle: "What are you hoping to accomplish?",
      content: (
        <OptionCardMultiSelect
          options={JOB_SEARCH_GOAL_OPTIONS}
          value={profile.jobSearchGoals}
          onChange={(jobSearchGoals) => patch({ jobSearchGoals })}
        />
      ),
    },
    {
      title: "Where are you in your search?",
      subtitle: "Which best describes you today?",
      content: (
        <OptionCardSingleSelect
          options={SEARCH_STAGE_OPTIONS}
          value={profile.searchStage}
          onChange={(searchStage) => patch({ searchStage })}
        />
      ),
    },
    {
      title: "What would you like help with?",
      subtitle: "What would you like OnlyFit to help you with?",
      content: (
        <OptionCardMultiSelect
          options={HELP_TOPIC_OPTIONS}
          value={profile.helpTopics}
          onChange={(helpTopics) => patch({ helpTopics })}
        />
      ),
    },
  ];
}
