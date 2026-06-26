/** Common IANA timezones for profile settings. */
export const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/** Prefill when the device timezone is in {@link TIMEZONE_OPTIONS}. */
export function guessProfileTimezone(): string | null {
  try {
    const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (TIMEZONE_OPTIONS as readonly string[]).includes(guessed)
      ? guessed
      : null;
  } catch {
    return null;
  }
}
