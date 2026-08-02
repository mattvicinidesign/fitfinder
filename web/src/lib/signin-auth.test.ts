/**
 * Sign-in auth helper tests.
 * Run: npx --yes tsx --test src/lib/signin-auth.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_NOT_FOUND_MESSAGE,
  isSignInUserNotFoundError,
} from "./signin-auth";

describe("isSignInUserNotFoundError", () => {
  it("detects Supabase shouldCreateUser:false signup rejection", () => {
    assert.equal(
      isSignInUserNotFoundError("Signups not allowed for otp"),
      true,
    );
    assert.equal(isSignInUserNotFoundError("Signup is disabled"), true);
  });

  it("detects explicit user-not-found messages", () => {
    assert.equal(isSignInUserNotFoundError("User not found"), true);
    assert.equal(isSignInUserNotFoundError("Unable to find user with email"), true);
  });

  it("ignores unrelated auth errors", () => {
    assert.equal(isSignInUserNotFoundError("Invalid login credentials"), false);
    assert.equal(isSignInUserNotFoundError("Token has expired or is invalid"), false);
    assert.equal(isSignInUserNotFoundError("Email rate limit exceeded"), false);
    assert.equal(isSignInUserNotFoundError(null), false);
    assert.equal(isSignInUserNotFoundError(""), false);
  });
});

describe("ACCOUNT_NOT_FOUND_MESSAGE", () => {
  it("matches the product copy requirement", () => {
    assert.equal(
      ACCOUNT_NOT_FOUND_MESSAGE,
      "We couldn’t find an account with that email.",
    );
  });
});
