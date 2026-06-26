"use client";

import { Button } from "@/components/ui/button";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { safeTopTitle } from "@/lib/safe-area";

export interface OnboardingStep {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  /** When true, header skip advances to the next step instead of exiting the flow. */
  skippable?: boolean;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  step: number;
  onStepChange: (step: number) => void;
  onFinish: () => void;
  onSkip?: () => void;
  onBackFromStart?: () => void;
  busy?: boolean;
  loading?: boolean;
  finishLabel?: string;
  continueLabel?: string;
  skipLabel?: string;
  skipStepLabel?: string;
  busyLabel?: string;
}

export function OnboardingWizard({
  steps,
  step,
  onStepChange,
  onFinish,
  onSkip,
  onBackFromStart,
  busy = false,
  loading = false,
  finishLabel = "Finish",
  continueLabel = "Continue",
  skipLabel = "Skip for now",
  skipStepLabel = "Skip",
  busyLabel = "Saving…",
}: OnboardingWizardProps) {
  const totalSteps = steps.length;
  const current = steps[step];
  const isLast = step === totalSteps - 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const stepSkippable = current?.skippable === true && !isLast;

  if (!current) return null;

  function handleHeaderSkip() {
    if (stepSkippable) {
      onStepChange(step + 1);
      return;
    }
    onSkip?.();
  }

  return (
    <div className={screenShellClass}>
      <StickyScreenHeader className={`px-4 pb-3 ${safeTopTitle}`}>
        <div className="flex items-center justify-between gap-3">
          {step === 0 && onBackFromStart ? (
            <button
              type="button"
              onClick={onBackFromStart}
              className="text-[13px] font-medium text-primary"
            >
              Back
            </button>
          ) : (
            <span className="text-[13px] font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
          )}
          {step === 0 && onBackFromStart ? (
            <span className="text-[13px] font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
          ) : null}
          {stepSkippable || onSkip ? (
            <button
              type="button"
              onClick={handleHeaderSkip}
              className="ml-auto text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              {stepSkippable ? skipStepLabel : skipLabel}
            </button>
          ) : (
            <span className="w-8" aria-hidden />
          )}
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </StickyScreenHeader>

      <StickyScreenBody className="px-4">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {current.title}
        </h1>
        {current.subtitle ? (
          <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
            {current.subtitle}
          </p>
        ) : null}
        <div className={current.subtitle ? "mt-5" : "mt-4"}>
          {loading ? null : current.content}
        </div>
      </StickyScreenBody>

      <StickyBottomCta>
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
      </StickyBottomCta>
    </div>
  );
}
