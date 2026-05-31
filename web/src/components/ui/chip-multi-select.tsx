"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Toggleable pill used across onboarding multi-select steps. */
export function SelectableChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground hover:bg-muted/70",
      )}
    >
      {selected ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
      {label}
    </button>
  );
}

/** Multi-select chip grid backed by a string[] value. */
export function ChipMultiSelect({
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
        ? value.filter((v) => v !== option)
        : [...value, option],
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <SelectableChip
          key={option}
          label={option}
          selected={value.includes(option)}
          onToggle={() => toggle(option)}
        />
      ))}
    </div>
  );
}
