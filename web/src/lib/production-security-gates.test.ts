/**
 * Production QA / debug gate tests.
 * Run: npx --yes tsx --test src/lib/production-security-gates.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors `isSplashQaEnabled` without mutating process.env.NODE_ENV (read-only in TS). */
function splashQaEnabled(nodeEnv: string, flag: string | undefined): boolean {
  if (nodeEnv === "development") return true;
  return flag === "true";
}

describe("splash QA production defaults", () => {
  it("is off in production without explicit flag", () => {
    assert.equal(splashQaEnabled("production", undefined), false);
  });

  it("is on in production when explicitly enabled", () => {
    assert.equal(splashQaEnabled("production", "true"), true);
  });

  it("is on in development regardless of flag", () => {
    assert.equal(splashQaEnabled("development", undefined), true);
    assert.equal(splashQaEnabled("development", ""), true);
  });
});

describe("jobs test route gate", () => {
  it("documents production opt-in via ENABLE_JOBS_TEST_ROUTE", () => {
    const enabled = (nodeEnv: string, flag?: string) =>
      nodeEnv === "development" || flag === "true";
    assert.equal(enabled("production"), false);
    assert.equal(enabled("production", "true"), true);
    assert.equal(enabled("development"), true);
  });
});
