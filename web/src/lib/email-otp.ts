export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

const DEFAULT_OTP_ERROR = "Something went wrong. Try again.";

/** Map GoTrue OTP / send-code errors to short in-app copy. */
export function normalizeEmailOtpError(
  message: string | null | undefined,
): string {
  if (!message?.trim()) return DEFAULT_OTP_ERROR;

  const normalized = message.toLowerCase();

  if (
    normalized.includes("expired") ||
    (normalized.includes("invalid") &&
      (normalized.includes("otp") ||
        normalized.includes("token") ||
        normalized.includes("code")))
  ) {
    return "That code is invalid or expired. Request a new one.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Please wait before requesting another code.";
  }

  return message;
}
