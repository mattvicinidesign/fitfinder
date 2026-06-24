import { FORM_FIELD_LABEL_CLASS } from "@/components/form-field-styles";
import { cn } from "@/lib/utils";

/** Header + track + tick layout for profile preference sliders. */
export function PreferenceSliderField({
  label,
  valuePrefix,
  valueDisplay,
  valueSuffix,
  children,
  ticks,
  className,
}: {
  label?: string;
  valuePrefix?: string;
  valueDisplay: string;
  valueSuffix: string;
  children: React.ReactNode;
  ticks: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex items-baseline gap-3",
          label ? "justify-between" : "justify-end",
        )}
      >
        {label ? <h2 className={FORM_FIELD_LABEL_CLASS}>{label}</h2> : null}
        <div className="flex shrink-0 items-center gap-1 text-[17px] leading-none tabular-nums" aria-live="polite">
          <span className="font-semibold text-primary">
            {valuePrefix}
            {valueDisplay}
          </span>
          <span className="font-normal text-muted-foreground">{valueSuffix}</span>
        </div>
      </div>
      <div className="space-y-2">
        {children}
        <div className="flex justify-between px-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {ticks}
        </div>
      </div>
    </div>
  );
}
