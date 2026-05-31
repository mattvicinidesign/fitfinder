"use client";

import { Button } from "@/components/ui/button";

export interface OnboardingStep {
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  step: number;
  onStepChange: (step: number) => void;
  onFinish: () => void;
  onSkip?: () => void;
  busy?: boolean;
  loading?: boolean;
  finishLabel?: string;
  continueLabel?: string;
  skipLabel?: string;
  busyLabel?: string;
}

export function OnboardingWizard({
  steps,
  step,
  onStepChange,
  onFinish,
  onSkip,
  busy = false,
  loading = false,
  finishLabel = "Finish",
  continueLabel = "Continue",
  skipLabel = "Skip for now",
  busyLabel = "Saving…",
}: OnboardingWizardProps) {
  const totalSteps = steps.length;
  const current = steps[step];
  const isLast = step === totalSteps - 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  if (!current) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </span>
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              {skipLabel}
            </button>
          ) : null}
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {current.title}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
          {current.subtitle}
        </p>
        <div className="mt-5">{loading ? null : current.content}</div>
      </div>

      <footer className="shrink-0 border-t border-border/60 bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-xl"
              onClick={() => onStepChange(step - 1)}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-12 flex-[2] rounded-xl text-[17px]"
            disabled={busy}
            onClick={() => (isLast ? onFinish() : onStepChange(step + 1))}
          >
            {isLast ? (busy ? busyLabel : finishLabel) : continueLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
