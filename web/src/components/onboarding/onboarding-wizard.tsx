"use client";

import { Button } from "@/components/ui/button";
import { CircleBackButton } from "@/components/ui/circle-back-button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { PRIMARY_FLOATING_CTA_CLASS } from "@/components/resume-upload-styles";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { safeBottomCta, safeTopTitle } from "@/lib/safe-area";

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
  /** When false, Continue / Finish is disabled until the step is complete. */
  canContinue?: boolean;
  finishLabel?: string;
  continueLabel?: string;
  skipLabel?: string;
  skipStepLabel?: string;
  busyLabel?: string;
  /** Inside LaunchOverlayFrame — parent already applies safe-area top inset. */
  compactTopInset?: boolean;
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
  canContinue = true,
  finishLabel = "Finish",
  continueLabel = "Continue",
  skipLabel = "Skip for now",
  skipStepLabel = "Skip",
  busyLabel = "Saving…",
  compactTopInset = false,
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

  function handleHeaderBack() {
    if (step > 0) {
      onStepChange(step - 1);
      return;
    }
    onBackFromStart?.();
  }

  const showHeaderBack = step > 0 || (step === 0 && onBackFromStart);
  const showHeaderSkip = stepSkippable || Boolean(onSkip);
  const ctaDisabled = busy || !canContinue;

  return (
    <div className={screenShellClass}>
      <StickyScreenHeader
        className={`px-4 pb-3 ${compactTopInset ? "pt-3" : safeTopTitle}`}
      >
        <div className="flex items-center justify-between gap-3">
          {showHeaderBack ? (
            <CircleBackButton
              onClick={handleHeaderBack}
              aria-label={step === 0 ? "Back to welcome" : "Previous step"}
            />
          ) : (
            <span className="size-9 shrink-0" aria-hidden />
          )}
          {showHeaderSkip ? (
            <button
              type="button"
              onClick={handleHeaderSkip}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {stepSkippable ? skipStepLabel : skipLabel}
            </button>
          ) : (
            <span className="size-9 shrink-0" aria-hidden />
          )}
        </div>

        <div className="mt-3">
          <p className="text-[13px] font-medium text-muted-foreground">
            Step <span className="text-primary">{step + 1}</span> of {totalSteps}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </StickyScreenHeader>

      <StickyScreenBody className="px-4 pb-24">
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

      <StickyBottomCta variant="floating" className={safeBottomCta} inactive={ctaDisabled}>
        <Button
          type="button"
          className={PRIMARY_FLOATING_CTA_CLASS}
          disabled={ctaDisabled}
          aria-busy={busy}
          aria-label={
            busy
              ? busyLabel
              : isLast
                ? finishLabel
                : continueLabel
          }
          onClick={() => (isLast ? onFinish() : onStepChange(step + 1))}
        >
          {busy ? (
            <CtaSpinner />
          ) : isLast ? (
            finishLabel
          ) : (
            continueLabel
          )}
        </Button>
      </StickyBottomCta>
    </div>
  );
}
