/**
 * Email OTP helper tests.
 * Run: npx --yes tsx --test src/lib/email-otp.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmailOtpError } from "./email-otp";

describe("normalizeEmailOtpError", () => {
  it("maps expired and invalid OTP messages", () => {
    assert.equal(
      normalizeEmailOtpError("Token has expired or is invalid"),
      "That code is invalid or expired. Request a new one.",
    );
    assert.equal(
      normalizeEmailOtpError("otp_expired"),
      "That code is invalid or expired. Request a new one.",
    );
    assert.equal(
      normalizeEmailOtpError("Invalid token"),
      "That code is invalid or expired. Request a new one.",
    );
  });

  it("maps rate-limit send failures", () => {
    assert.equal(
      normalizeEmailOtpError("Email rate limit exceeded"),
      "Please wait before requesting another code.",
    );
  });

  it("passes through unrelated auth errors", () => {
    assert.equal(
      normalizeEmailOtpError("Unable to send email"),
      "Unable to send email",
    );
    assert.equal(
      normalizeEmailOtpError("Invalid login credentials"),
      "Invalid login credentials",
    );
  });

  it("uses a fallback for empty messages", () => {
    assert.equal(
      normalizeEmailOtpError(null),
      "Something went wrong. Try again.",
    );
    assert.equal(
      normalizeEmailOtpError(""),
      "Something went wrong. Try again.",
    );
  });
});
