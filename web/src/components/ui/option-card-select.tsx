"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function OptionCard({
  label,
  selected,
  onToggle,
  role,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  role: "checkbox" | "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-primary/70 bg-primary/10"
          : "border-border/60 bg-muted/40 hover:bg-muted/55",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/80 bg-transparent",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug text-foreground">
        {label}
      </span>
    </button>
  );
}

/** Multi-select option cards for onboarding intent questions. */
export function OptionCardMultiSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {options.map((option) => (
        <OptionCard
          key={option}
          label={option}
          selected={value.includes(option)}
          onToggle={() => toggle(option)}
          role="checkbox"
        />
      ))}
    </div>
  );
}

/** Single-select option cards for onboarding intent questions. */
export function OptionCardSingleSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {options.map((option) => (
        <OptionCard
          key={option}
          label={option}
          selected={value === option}
          onToggle={() => onChange(option)}
          role="radio"
        />
      ))}
    </div>
  );
}
