"use client";

import {
  HOURLY_RATE_DEFAULT,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  HOURLY_RATE_STEP,
} from "@/lib/onboarding-options";
import { coerceProfileNumeric } from "@/lib/employer-rating-match";
import {
  PREFERENCE_SLIDER_INPUT_CLASS,
  preferenceSliderTrackFill,
} from "@/components/preference-slider-styles";
import { cn } from "@/lib/utils";

function clampHourlyRate(value: number): number {
  return Math.max(HOURLY_RATE_MIN, Math.min(HOURLY_RATE_MAX, value));
}

function formatHourlyRateDisplay(rate: number): string {
  return rate >= HOURLY_RATE_MAX ? `$${HOURLY_RATE_MAX}+` : `$${rate}`;
}

const TICK_MARKS = [50, 100, 150, 200] as const;

export function MinimumHourlyRateSlider({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
}) {
  const sliderValue = clampHourlyRate(
    coerceProfileNumeric(value) ?? HOURLY_RATE_DEFAULT,
  );
  const displayValue = formatHourlyRateDisplay(sliderValue);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-baseline gap-2">
        <p
          className="text-[34px] font-bold leading-none tabular-nums tracking-tight"
          aria-live="polite"
        >
          {displayValue}
        </p>
        <p className="text-[15px] text-muted-foreground">/hr</p>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={HOURLY_RATE_MIN}
          max={HOURLY_RATE_MAX}
          step={HOURLY_RATE_STEP}
          value={sliderValue}
          onChange={(event) =>
            onChange(clampHourlyRate(Number(event.target.value)))
          }
          aria-label="Minimum hourly rate"
          aria-valuemin={HOURLY_RATE_MIN}
          aria-valuemax={HOURLY_RATE_MAX}
          aria-valuenow={sliderValue}
          aria-valuetext={`${displayValue} per hour`}
          className={PREFERENCE_SLIDER_INPUT_CLASS}
          style={{
            background: preferenceSliderTrackFill(
              sliderValue,
              HOURLY_RATE_MIN,
              HOURLY_RATE_MAX,
            ),
          }}
        />
        <div className="flex justify-between px-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {TICK_MARKS.map((tick) => (
            <span key={tick}>${tick}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
