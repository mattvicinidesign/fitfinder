import { ChevronDown } from "lucide-react";
import {
  FORM_FIELD_CONTROL_SIZE_CLASS,
} from "@/components/form-field-styles";
import { cn } from "@/lib/utils";

/** Native `<select>` styling — matches text fields; hides OS chevron for consistent spacing. */
export const formSelectClassName = cn(
  "h-11 w-full appearance-none rounded-lg border border-input bg-transparent pl-3 pr-12",
  FORM_FIELD_CONTROL_SIZE_CLASS,
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "dark:bg-input/30",
);

function isSelectPlaceholder(
  value: React.ComponentProps<"select">["value"],
  defaultValue: React.ComponentProps<"select">["defaultValue"],
): boolean {
  const selected = value !== undefined ? value : defaultValue;
  return selected == null || selected === "";
}

export function FormSelect({
  className,
  value,
  defaultValue,
  ...props
}: React.ComponentProps<"select">) {
  const placeholder = isSelectPlaceholder(value, defaultValue);

  return (
    <div className="relative">
      <select
        {...props}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          formSelectClassName,
          placeholder ? "text-muted-foreground" : "text-foreground",
          className,
        )}
      />
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2.25}
        aria-hidden
      />
    </div>
  );
}
