/**
 * Auth redirect allowlist tests.
 * Run: npx --yes tsx --test src/lib/safe-auth-redirect.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeAuthNextPath } from "./safe-auth-redirect";

describe("sanitizeAuthNextPath", () => {
  it("allows safe internal paths", () => {
    assert.equal(sanitizeAuthNextPath("/home"), "/home");
    assert.equal(sanitizeAuthNextPath("/analyze"), "/analyze");
    assert.equal(sanitizeAuthNextPath("/profile"), "/profile");
    assert.equal(sanitizeAuthNextPath("/analyze/report"), "/analyze/report");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    assert.equal(sanitizeAuthNextPath("//evil.com"), "/home");
    assert.equal(sanitizeAuthNextPath("https://evil.com"), "/home");
    assert.equal(sanitizeAuthNextPath("http://evil.com/phish"), "/home");
    assert.equal(sanitizeAuthNextPath("/\\evil.com"), "/home");
  });

  it("rejects encoded bypasses", () => {
    assert.equal(sanitizeAuthNextPath("%2F%2Fevil.com"), "/home");
    assert.equal(sanitizeAuthNextPath("%2f%2fevil.com"), "/home");
  });

  it("rejects unknown paths", () => {
    assert.equal(sanitizeAuthNextPath("/admin"), "/home");
    assert.equal(sanitizeAuthNextPath("/api/jobs/test"), "/home");
  });

  it("uses fallback for empty input", () => {
    assert.equal(sanitizeAuthNextPath(null), "/home");
    assert.equal(sanitizeAuthNextPath(""), "/home");
    assert.equal(sanitizeAuthNextPath("   "), "/home");
  });
});
