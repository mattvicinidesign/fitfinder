"use client";

import { SelectableChip } from "@/components/ui/chip-multi-select";

export type AppearanceMode = "light" | "dark";

export function AppearanceModeSetting({
  value,
  onChange,
}: {
  value: AppearanceMode;
  onChange: (mode: AppearanceMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color mode">
      <SelectableChip
        label="Light"
        selected={value === "light"}
        onToggle={() => onChange("light")}
      />
      <SelectableChip
        label="Dark"
        selected={value === "dark"}
        onToggle={() => onChange("dark")}
      />
    </div>
  );
}
