import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
} from "@/components/form-field-styles";
import { TIMEZONE_OPTIONS } from "@/lib/timezone-options";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "h-11 w-full rounded-md border border-input bg-background px-3 text-[17px] text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

export function TimezoneSelect({
  value,
  onChange,
  id = "timezone",
  label = "Timezone",
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn(FORM_FIELD_GROUP_CLASS, className)}>
      <label htmlFor={id} className={FORM_FIELD_LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        className={selectClassName}
        aria-label={label}
      >
        <option value="">Select timezone</option>
        {TIMEZONE_OPTIONS.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
