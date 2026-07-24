// Security hardening unit tests.
// Run from supabase/functions:
//   deno test --allow-none _shared/security_hardening_test.ts

import { assertEquals } from "jsr:@std/assert@1";
import { resolveTrustedCategoryWeights } from "./account_access.ts";
import { limitForOperation } from "./ai_rate_limit.ts";
import {
  assertJobTextSize,
  assertResumeFileBytes,
  assertResumeFilename,
  assertResumeTextSize,
  MAX_JOB_TEXT_CHARS,
  MAX_RESUME_FILE_BYTES,
} from "./payload_limits.ts";
import { clientSafeErrorMessage } from "./safe_error.ts";

Deno.test("guest cannot unlock registered scoring via client categoryWeights", () => {
  const stored = { skillsTools: 10 } as Record<string, number>;
  const tampered = { skillsTools: 99, preferenceFit: 50 } as Record<
    string,
    number
  >;
  assertEquals(
    resolveTrustedCategoryWeights("guest", tampered, stored),
    stored,
  );
  assertEquals(
    resolveTrustedCategoryWeights("guest", tampered, null),
    null,
  );
});

Deno.test("registered may use client categoryWeights", () => {
  const stored = { skillsTools: 10 } as Record<string, number>;
  const requested = { skillsTools: 40 } as Record<string, number>;
  assertEquals(
    resolveTrustedCategoryWeights("registered", requested, stored),
    requested,
  );
  assertEquals(
    resolveTrustedCategoryWeights("registered", null, stored),
    stored,
  );
});

Deno.test("guest AI rate limits are stricter than registered", () => {
  const ops = [
    "analyze",
    "parse-resume",
    "parse-job",
    "review-resume",
    "optimize-ats-keywords",
    "export-optimized-resume",
    "generate-proposal",
  ] as const;
  for (const op of ops) {
    assertEquals(
      limitForOperation(op, true) < limitForOperation(op, false),
      true,
      `${op} guest limit should be stricter`,
    );
  }
});

Deno.test("rejects oversized job and resume payloads", () => {
  assertEquals(assertJobTextSize("ok"), null);
  assertEquals(
    assertJobTextSize("x".repeat(MAX_JOB_TEXT_CHARS + 1)) !== null,
    true,
  );
  assertEquals(assertResumeTextSize("ok"), null);
  assertEquals(assertResumeTextSize("x".repeat(200_001)) !== null, true);
  assertEquals(assertResumeFileBytes(MAX_RESUME_FILE_BYTES), null);
  assertEquals(
    assertResumeFileBytes(MAX_RESUME_FILE_BYTES + 1) !== null,
    true,
  );
});

Deno.test("rejects disallowed resume extensions", () => {
  assertEquals(assertResumeFilename("resume.pdf"), null);
  assertEquals(assertResumeFilename("resume.docx"), null);
  assertEquals(assertResumeFilename("resume.exe") !== null, true);
  assertEquals(assertResumeFilename("resume") !== null, true);
});

Deno.test("safe errors never echo OpenAI bodies or secrets", () => {
  const openai = clientSafeErrorMessage(
    new Error('OpenAI request failed (429): {"error":{"message":"quota"}}'),
  );
  assertEquals(openai.includes("quota"), false);
  assertEquals(openai.includes("OpenAI request failed (429): {"), false);

  const secret = clientSafeErrorMessage(
    new Error("Missing SUPABASE_SERVICE_ROLE_KEY bearer sk-abc"),
  );
  assertEquals(secret.includes("SERVICE_ROLE"), false);
  assertEquals(secret.includes("sk-abc"), false);

  assertEquals(
    clientSafeErrorMessage(new Error("jobText is required")),
    "jobText is required",
  );
  assertEquals(
    clientSafeErrorMessage(new Error("Too many requests. Please wait")),
    "Too many requests. Please wait",
  );
});
