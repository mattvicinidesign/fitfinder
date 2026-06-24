"use client";

import {
  clampEmployerRatingPreference,
  formatEmployerRatingDisplay,
} from "@/lib/employer-rating-match";
import {
  PREFERENCE_SLIDER_INPUT_CLASS,
  preferenceSliderTrackFill,
} from "@/components/preference-slider-styles";
import { cn } from "@/lib/utils";

const RATING_MIN = 0;
const RATING_MAX = 5;
const RATING_STEP = 0.5;
const RATING_DEFAULT = 4;

export function EmployerRatingSlider({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
}) {
  const sliderValue = value ?? RATING_DEFAULT;
  const displayValue = formatEmployerRatingDisplay(sliderValue);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-baseline gap-2">
        <p
          className="text-[34px] font-bold leading-none tabular-nums tracking-tight"
          aria-live="polite"
        >
          {displayValue}
        </p>
        <p className="text-[15px] text-muted-foreground">out of 5</p>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={RATING_MIN}
          max={RATING_MAX}
          step={RATING_STEP}
          value={sliderValue}
          onChange={(event) =>
            onChange(
              clampEmployerRatingPreference(Number(event.target.value)) ?? RATING_DEFAULT,
            )
          }
          aria-label="Minimum client rating"
          aria-valuemin={RATING_MIN}
          aria-valuemax={RATING_MAX}
          aria-valuenow={sliderValue}
          aria-valuetext={`${displayValue} out of 5`}
          className={PREFERENCE_SLIDER_INPUT_CLASS}
          style={{
            background: preferenceSliderTrackFill(
              sliderValue,
              RATING_MIN,
              RATING_MAX,
            ),
          }}
        />
        <div className="flex justify-between px-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          <span>0</span>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
      </div>
    </div>
  );
}
