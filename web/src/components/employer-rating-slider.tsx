"use client";

import {
  clampEmployerRatingPreference,
  formatEmployerRatingDisplay,
} from "@/lib/employer-rating-match";
import { PreferenceSliderField } from "@/components/preference-slider-field";
import { PreferenceSliderInput } from "@/components/preference-slider-input";

const RATING_MIN = 0;
const RATING_MAX = 5;
const RATING_STEP = 0.5;
const RATING_DEFAULT = 4;

export function EmployerRatingSlider({
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
  const sliderValue = value ?? RATING_DEFAULT;
  const displayValue = formatEmployerRatingDisplay(sliderValue);

  return (
    <PreferenceSliderField
      label={label}
      valueDisplay={displayValue}
      valueSuffix=" / 5"
      className={className}
      ticks={
        <>
          <span>0</span>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </>
      }
    >
      <PreferenceSliderInput
        min={RATING_MIN}
        max={RATING_MAX}
        step={RATING_STEP}
        value={sliderValue}
        onChange={(next) =>
          onChange(clampEmployerRatingPreference(next) ?? RATING_DEFAULT)
        }
        tooltipLabel={displayValue}
        ariaLabel={label ?? "Minimum client rating"}
        ariaValueText={`${displayValue} out of 5`}
      />
    </PreferenceSliderField>
  );
}
