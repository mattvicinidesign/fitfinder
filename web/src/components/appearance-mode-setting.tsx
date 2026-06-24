"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SelectableChip } from "@/components/ui/chip-multi-select";

export function AppearanceModeSetting() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mode = mounted && theme === "light" ? "light" : "dark";

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color mode">
      <SelectableChip
        label="Light"
        selected={mode === "light"}
        onToggle={() => setTheme("light")}
      />
      <SelectableChip
        label="Dark"
        selected={mode === "dark"}
        onToggle={() => setTheme("dark")}
      />
    </div>
  );
}
