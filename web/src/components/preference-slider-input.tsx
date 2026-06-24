"use client";

import { useState } from "react";
import {
  PREFERENCE_SLIDER_INPUT_CLASS,
  preferenceSliderTrackFill,
} from "@/components/preference-slider-styles";
import { cn } from "@/lib/utils";

function SliderValueTooltip({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-[calc(100%+24px)] z-10 -translate-x-1/2"
      style={{ left: `${percent}%` }}
      role="tooltip"
    >
      <div className="relative">
        <div className="rounded-[10px] border-2 border-primary bg-background px-3 py-1.5 text-[15px] font-semibold leading-none tabular-nums text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.55)]">
          {label}
        </div>
        <div aria-hidden className="absolute left-1/2 top-full -translate-x-1/2">
          <div className="h-0 w-0 border-x-[8px] border-x-transparent border-t-[9px] border-t-primary" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-px h-0 w-0 border-x-[6px] border-x-transparent border-t-[7px] border-t-background" />
        </div>
      </div>
    </div>
  );
}

export function PreferenceSliderInput({
  min,
  max,
  step,
  value,
  onChange,
  tooltipLabel,
  ariaLabel,
  ariaValueText,
  className,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  tooltipLabel: string;
  ariaLabel: string;
  ariaValueText: string;
  className?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  function hideTooltip() {
    setShowTooltip(false);
  }

  return (
    <div className={cn("relative", className)}>
      {showTooltip ? (
        <SliderValueTooltip label={tooltipLabel} percent={percent} />
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={(event) => {
          setShowTooltip(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          hideTooltip();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={hideTooltip}
        onLostPointerCapture={hideTooltip}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        className={PREFERENCE_SLIDER_INPUT_CLASS}
        style={{
          background: preferenceSliderTrackFill(value, min, max),
        }}
      />
    </div>
  );
}
