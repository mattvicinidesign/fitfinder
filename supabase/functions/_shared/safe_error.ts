// Sanitize errors returned to clients — never leak OpenAI bodies, keys, or stack traces.

const SAFE_FALLBACK = "Something went wrong. Please try again.";

const SAFE_PREFIXES = [
  "Unauthorized",
  "jobText is required",
  "Resume text is required",
  "Resume file must be under",
  "Job description is too long",
  "Resume text is too long",
  "Unsupported resume format",
  "Too many requests",
  "originalATSScore is required",
  "resumeId is required",
  "Could not download resume",
  "Resume not found",
  "Method not allowed",
  "Only PDF files",
  "Could not extract text",
  "Sign in",
  "Session expired",
];

/** Map an unknown thrown value to a client-safe message. */
export function clientSafeErrorMessage(
  err: unknown,
  fallback: string = SAFE_FALLBACK,
): string {
  if (!(err instanceof Error)) return fallback;
  const message = err.message?.trim() || "";
  if (!message) return fallback;

  // Never echo upstream OpenAI / provider payloads.
  if (/openai/i.test(message) || /api\.openai\.com/i.test(message)) {
    console.error("[safe_error] OpenAI failure:", message.slice(0, 500));
    return "AI service temporarily unavailable. Please try again.";
  }

  if (/service.?role|apikey|api[_ -]?key|bearer\s+[a-z0-9._-]+/i.test(message)) {
    console.error("[safe_error] Sensitive error suppressed");
    return fallback;
  }

  if (SAFE_PREFIXES.some((p) => message.startsWith(p) || message.includes(p))) {
    // Cap length so DB messages cannot dump huge payloads.
    return message.length > 280 ? `${message.slice(0, 277)}…` : message;
  }

  console.error("[safe_error] Internal:", message.slice(0, 500));
  return fallback;
}
