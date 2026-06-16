import { Input } from "@/components/ui/input";
import { ChipMultiSelect, SelectableChip } from "@/components/ui/chip-multi-select";
import {
  COMPANY_TYPE_OPTIONS,
  EMPLOYER_RATING_PRESETS,
  HOURLY_RATE_PRESETS,
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={5}
              step={0.1}
              placeholder="4.0"
              value={profile.preferredMinimumEmployerRating?.toString() ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                patch({
                  preferredMinimumEmployerRating: raw
                    ? Math.max(0, Math.min(5, Number(raw)))
                    : null,
                });
              }}
              className="h-11 w-28 text-[17px]"
            />
            <span className="text-[15px] text-muted-foreground">out of 5</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {EMPLOYER_RATING_PRESETS.map((rating) => (
              <SelectableChip
                key={rating}
                label={rating === 5 ? "5.0" : String(rating)}
                selected={profile.preferredMinimumEmployerRating === rating}
                onToggle={() =>
                  patch({ preferredMinimumEmployerRating: rating })
                }
              />
            ))}
          </div>
        </div>
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
