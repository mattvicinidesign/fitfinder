"use client";

import {
  HOURLY_RATE_DEFAULT,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  HOURLY_RATE_STEP,
} from "@/lib/onboarding-options";
import { coerceProfileNumeric } from "@/lib/employer-rating-match";
import { PreferenceSliderField } from "@/components/preference-slider-field";
import { PreferenceSliderInput } from "@/components/preference-slider-input";

function clampHourlyRate(value: number): number {
  return Math.max(HOURLY_RATE_MIN, Math.min(HOURLY_RATE_MAX, value));
}

function formatHourlyRateAmount(rate: number): string {
  return rate >= HOURLY_RATE_MAX ? `${HOURLY_RATE_MAX}+` : String(rate);
}

function formatHourlyRateDisplay(rate: number): string {
  return `$${formatHourlyRateAmount(rate)}`;
}

const TICK_MARKS = [50, 100, 150, 200] as const;

export function MinimumHourlyRateSlider({
  label,
  value,
  onChange,
  className,
}: {
  label?: string;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
}) {
  const sliderValue = clampHourlyRate(
    coerceProfileNumeric(value) ?? HOURLY_RATE_DEFAULT,
  );
  const displayAmount = formatHourlyRateAmount(sliderValue);
  const displayValue = formatHourlyRateDisplay(sliderValue);

  return (
    <PreferenceSliderField
      label={label}
      valuePrefix="$"
      valueDisplay={displayAmount}
      valueSuffix=" /hr"
      className={className}
      ticks={
        <>
          {TICK_MARKS.map((tick) => (
            <span key={tick}>${tick}</span>
          ))}
        </>
      }
    >
      <PreferenceSliderInput
        min={HOURLY_RATE_MIN}
        max={HOURLY_RATE_MAX}
        step={HOURLY_RATE_STEP}
        value={sliderValue}
        onChange={(next) => onChange(clampHourlyRate(next))}
        tooltipLabel={displayValue}
        ariaLabel={label ?? "Minimum hourly rate"}
        ariaValueText={`${displayValue} per hour`}
      />
    </PreferenceSliderField>
  );
}
