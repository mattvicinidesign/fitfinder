import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
} from "@/components/form-field-styles";
import { FormSelect } from "@/components/form-select";
import { LOCATION_OPTIONS } from "@/lib/onboarding-options";
import { cn } from "@/lib/utils";

export function LocationSelect({
  value,
  onChange,
  id = "location",
  label = "Location",
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  label?: string;
  className?: string;
}) {
  const trimmed = value?.trim() ?? "";
  const isLegacy =
    trimmed.length > 0 &&
    !(LOCATION_OPTIONS as readonly string[]).includes(trimmed);

  return (
    <div className={cn(FORM_FIELD_GROUP_CLASS, className)}>
      <label htmlFor={id} className={FORM_FIELD_LABEL_CLASS}>
        {label}
      </label>
      <FormSelect
        id={id}
        value={trimmed}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        aria-label={label}
      >
        <option value="">Select location</option>
        {isLegacy ? <option value={trimmed}>{trimmed}</option> : null}
        {LOCATION_OPTIONS.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
