import { cn } from "@/lib/utils";

export const PREFERENCE_SLIDER_INPUT_CLASS = cn(
  "block h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/80",
  "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
  "[&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background",
  "[&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.28)]",
  "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary",
  "[&::-moz-range-thumb]:bg-background",
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted/80",
);

export function preferenceSliderTrackFill(
  value: number,
  min: number,
  max: number,
): string {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, color-mix(in oklab, var(--muted) 80%, transparent) ${percent}%, color-mix(in oklab, var(--muted) 80%, transparent) 100%)`;
}
