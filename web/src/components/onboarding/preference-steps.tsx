import { Input } from "@/components/ui/input";
import { ChipMultiSelect, SelectableChip } from "@/components/ui/chip-multi-select";
import {
  COMPANY_TYPE_OPTIONS,
  ENGAGEMENT_TYPE_OPTIONS,
  HOURLY_RATE_PRESETS,
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[20px] text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="75"
              value={profile.minimumHourlyRate?.toString() ?? ""}
              onChange={(e) =>
                patch({
                  minimumHourlyRate: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="h-11 w-28 text-[17px]"
            />
            <span className="text-[15px] text-muted-foreground">/hr</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {HOURLY_RATE_PRESETS.map((rate) => (
              <SelectableChip
                key={rate}
                label={rate >= 150 ? `$${rate}+` : `$${rate}`}
                selected={profile.minimumHourlyRate === rate}
                onToggle={() => patch({ minimumHourlyRate: rate })}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "What types of work are you interested in?",
      subtitle: "Used to match the job's engagement and contract structure.",
      content: (
        <ChipMultiSelect
          options={ENGAGEMENT_TYPE_OPTIONS}
          value={profile.preferredEngagementTypes}
          onChange={(v) => patch({ preferredEngagementTypes: v })}
        />
      ),
    },
    {
      title: "What types of companies do you prefer?",
      subtitle: "Feeds client fit and company-type alignment.",
      content: (
        <ChipMultiSelect
          options={COMPANY_TYPE_OPTIONS}
          value={profile.preferredCompanyTypes}
          onChange={(v) => patch({ preferredCompanyTypes: v })}
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
