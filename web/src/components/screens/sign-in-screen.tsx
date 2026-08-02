"use client";

import { useState, type ComponentProps } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-shell/app-frame";
import { CheckEmailIllustration } from "@/components/check-email-illustration";
import { Button } from "@/components/ui/button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleBackButton } from "@/components/ui/circle-back-button";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_INPUT_BORDERLESS_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELDS_SECTION_GAP_CLASS,
} from "@/components/form-field-styles";
import {
  PRIMARY_FLOATING_CTA_CLASS,
  SCREEN_PRIMARY_CTA_CLASS,
  SCREEN_PRIMARY_OUTLINE_CTA_CLASS,
} from "@/components/resume-upload-styles";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { clearOnboardingProgress } from "@/lib/onboarding-progress";
import {
  clearAuthDeepLinkPending,
  DEFAULT_APP_ROUTE,
  markAuthDeepLinkPending,
  markLaunchFlowComplete,
  markWelcomeComplete,
} from "@/lib/app-session";
import { navigateApp } from "@/lib/navigate-app";
import { safeBottomCta, safeTopTitle } from "@/lib/safe-area";
import {
  ACCOUNT_NOT_FOUND_MESSAGE,
  sendSignInVerificationEmail,
  SIGNIN_COMPLETE_ROUTE,
  verifySignInOtp,
} from "@/lib/signin-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SignInPhase = "credentials" | "otp" | "not-found";

function AccountField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  inputMode,
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: ComponentProps<"input">["inputMode"];
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className={FORM_FIELD_GROUP_CLASS}>
      <Label htmlFor={id} className={FORM_FIELD_LABEL_CLASS}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={FORM_FIELD_INPUT_BORDERLESS_CLASS}
      />
    </div>
  );
}

export function SignInScreen({
  embedded = false,
  onBackToWelcome,
  onCreateAccount,
  onSignedIn,
}: {
  embedded?: boolean;
  onBackToWelcome?: () => void;
  onCreateAccount?: () => void;
  /** Exit launch overlay after a successful OTP verify. */
  onSignedIn?: () => void;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<SignInPhase>("credentials");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmedName = displayName.trim();
  const trimmedEmail = email.trim();
  const trimmedOtp = otp.trim();
  const canContinueCredentials =
    Boolean(trimmedName) &&
    Boolean(trimmedEmail) &&
    trimmedEmail.includes("@");
  const canVerifyOtp = trimmedOtp.length >= 6;

  function finishSignIn() {
    markLaunchFlowComplete();
    markWelcomeComplete();
    clearAuthDeepLinkPending();
    clearOnboardingProgress();
    onSignedIn?.();

    if (
      pathname === DEFAULT_APP_ROUTE ||
      pathname === SIGNIN_COMPLETE_ROUTE
    ) {
      return;
    }

    navigateApp(SIGNIN_COMPLETE_ROUTE, router, "replace");
  }

  async function handleSendCode() {
    if (!displayName.trim()) {
      toast.error("Enter your name to continue.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Enter your email to continue.");
      return;
    }

    setBusy(true);
    markAuthDeepLinkPending();
    const { error, accountNotFound } = await sendSignInVerificationEmail({
      email: trimmedEmail,
      redirectNext: SIGNIN_COMPLETE_ROUTE,
    });
    setBusy(false);

    if (accountNotFound) {
      setPhase("not-found");
      return;
    }

    if (error) {
      toast.error(error);
      return;
    }

    setOtp("");
    setPhase("otp");
  }

  async function handleVerifyCode() {
    if (!canVerifyOtp) {
      toast.error("Enter the verification code from your email.");
      return;
    }

    setBusy(true);
    const { error, accountNotFound } = await verifySignInOtp({
      email: trimmedEmail,
      token: trimmedOtp,
    });
    setBusy(false);

    if (accountNotFound) {
      setPhase("not-found");
      return;
    }

    if (error) {
      toast.error(error);
      return;
    }

    finishSignIn();
  }

  async function handleResend() {
    setBusy(true);
    markAuthDeepLinkPending();
    const { error, accountNotFound } = await sendSignInVerificationEmail({
      email: trimmedEmail,
      redirectNext: SIGNIN_COMPLETE_ROUTE,
    });
    setBusy(false);

    if (accountNotFound) {
      setPhase("not-found");
      return;
    }

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Code sent again.");
  }

  function handleBack() {
    if (phase === "otp") {
      setPhase("credentials");
      setOtp("");
      return;
    }
    onBackToWelcome?.();
  }

  const content =
    phase === "not-found" ? (
      <div className={screenShellClass}>
        <StickyScreenHeader
          className={`px-4 pb-3 ${embedded ? "pt-3" : safeTopTitle}`}
        >
          <div className="flex items-center justify-between gap-3">
            <CircleBackButton
              onClick={() => setPhase("credentials")}
              aria-label="Back to sign in"
            />
            <span className="size-9 shrink-0" aria-hidden />
          </div>
        </StickyScreenHeader>
        <StickyScreenBody className="px-4 pb-24">
          <div className="flex flex-col items-center pt-8 text-center">
            <div className="mb-8 flex h-[140px] w-[220px] max-w-full items-center justify-center">
              <CheckEmailIllustration />
            </div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">
              Account not found
            </h1>
            <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-muted-foreground">
              {ACCOUNT_NOT_FOUND_MESSAGE}
            </p>
          </div>
        </StickyScreenBody>
        <StickyBottomCta variant="floating" className={safeBottomCta}>
          <div className="flex w-full flex-col gap-3">
            <Button
              type="button"
              className={PRIMARY_FLOATING_CTA_CLASS}
              onClick={() => onCreateAccount?.()}
            >
              Create Account
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                SCREEN_PRIMARY_CTA_CLASS,
                SCREEN_PRIMARY_OUTLINE_CTA_CLASS,
              )}
              onClick={() => setPhase("credentials")}
            >
              Try a different email
            </Button>
          </div>
        </StickyBottomCta>
      </div>
    ) : phase === "otp" ? (
      <div className={screenShellClass}>
        <StickyScreenHeader
          className={`px-4 pb-3 ${embedded ? "pt-3" : safeTopTitle}`}
        >
          <div className="flex items-center justify-between gap-3">
            <CircleBackButton onClick={handleBack} aria-label="Back" />
            <span className="size-9 shrink-0" aria-hidden />
          </div>
        </StickyScreenHeader>
        <StickyScreenBody className="px-4 pb-24">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            {trimmedName ? `Welcome back, ${trimmedName}` : "Welcome Back"}
          </h1>
          <p className="mt-1 text-[15px] leading-snug text-muted-foreground">
            Enter the code we sent to{" "}
            <span className="font-medium text-foreground">{trimmedEmail}</span>
            , or open the link in the email.
          </p>
          <div className={cn("mt-5 flex flex-col", FORM_FIELDS_SECTION_GAP_CLASS)}>
            <AccountField
              id="signin-otp"
              label="Verification code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              maxLength={8}
              value={otp}
              onChange={(value) =>
                setOtp(value.replace(/\s+/g, "").replace(/[^\d]/g, ""))
              }
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResend()}
            className="mt-6 text-[15px] font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            Resend code
          </button>
        </StickyScreenBody>
        <StickyBottomCta
          variant="floating"
          className={safeBottomCta}
          inactive={busy || !canVerifyOtp}
        >
          <Button
            type="button"
            className={PRIMARY_FLOATING_CTA_CLASS}
            disabled={busy || !canVerifyOtp}
            aria-busy={busy}
            onClick={() => void handleVerifyCode()}
          >
            {busy ? <CtaSpinner /> : "Continue"}
          </Button>
        </StickyBottomCta>
      </div>
    ) : (
      <div className={screenShellClass}>
        <StickyScreenHeader
          className={`px-4 pb-3 ${embedded ? "pt-3" : safeTopTitle}`}
        >
          <div className="flex items-center justify-between gap-3">
            {onBackToWelcome ? (
              <CircleBackButton
                onClick={handleBack}
                aria-label="Back to welcome"
              />
            ) : (
              <span className="size-9 shrink-0" aria-hidden />
            )}
            <span className="size-9 shrink-0" aria-hidden />
          </div>
        </StickyScreenHeader>
        <StickyScreenBody className="px-4 pb-24">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            Welcome Back
          </h1>
          <p className="mt-1 text-[15px] leading-snug text-muted-foreground">
            Sign in with the email on your OnlyFit account. Your name is only
            used to greet you here.
          </p>
          <div className={cn("mt-5 flex flex-col", FORM_FIELDS_SECTION_GAP_CLASS)}>
            <AccountField
              id="signin-name"
              label="Name"
              placeholder="Your name"
              autoComplete="name"
              value={displayName}
              onChange={setDisplayName}
            />
            <AccountField
              id="signin-email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
          </div>
        </StickyScreenBody>
        <StickyBottomCta
          variant="floating"
          className={safeBottomCta}
          inactive={busy || !canContinueCredentials}
        >
          <Button
            type="button"
            className={PRIMARY_FLOATING_CTA_CLASS}
            disabled={busy || !canContinueCredentials}
            aria-busy={busy}
            onClick={() => void handleSendCode()}
          >
            {busy ? <CtaSpinner /> : "Continue"}
          </Button>
        </StickyBottomCta>
      </div>
    );

  if (embedded) {
    return content;
  }

  return <AppFrame>{content}</AppFrame>;
}
