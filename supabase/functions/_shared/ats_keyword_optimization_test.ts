// Tests for ATS bullet-only keyword optimization. Run: deno test (from supabase/functions).

import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  buildBulletId,
  buildOptimizedResumeText,
  isBulletLine,
  scanResumeWithDiscovery,
} from "./ats_keyword_optimization.ts";

Deno.test("ATS optimization: discovery targets bullet lines only", () => {
  const resumeText = [
    "JANE DOE",
    "Product Designer",
    "SUMMARY",
    "Passionate about building delightful products.",
    "EXPERIENCE",
    "Acme Corp | 2020–Present",
    "• Helped design the onboarding flow",
    "SKILLS",
    "Figma, Research, Prototyping",
  ].join("\n");

  const result = scanResumeWithDiscovery(resumeText, 10);
  assert(result.keywordChanges.length > 0);
  for (const change of result.keywordChanges) {
    assertEquals(typeof change.lineIndex, "number");
    assert(change.originalBulletText?.includes("Helped"));
    assert(change.optimizedBulletText?.includes("Led"));
    assertEquals(change.bulletId, buildBulletId(change.lineIndex!));
    const line = resumeText.split("\n")[change.lineIndex!]!;
    assert(isBulletLine(line));
  }

  assertEquals(
    result.keywordChanges.some((change) => change.lineIndex === 3),
    false,
    "Summary lines must not be optimized",
  );
});

Deno.test("ATS optimization: rejects feedback→user feedback when user already precedes", () => {
  const resumeText = [
    "EXPERIENCE",
    "• Partnered closely with founders to iterate on user feedback",
    "• Defined user flows, wireframes, and prototypes in Figma",
  ].join("\n");

  const result = scanResumeWithDiscovery(resumeText, 10);
  assertEquals(
    result.keywordChanges.some(
      (change) =>
        change.before.toLowerCase() === "feedback" &&
        change.after.toLowerCase() === "user feedback",
    ),
    false,
    "Must not suggest feedback→user feedback on existing user feedback",
  );

  const wireframeChange = result.keywordChanges.find(
    (change) => change.before.toLowerCase() === "wireframes",
  );
  assert(wireframeChange, "Expected a wireframes suggestion");

  const applied = buildOptimizedResumeText(
    resumeText,
    result.keywordChanges,
    result.keywordChanges.map((_, index) => index),
  );
  assertEquals(applied.reverted, false);
  assert(
    !applied.optimizedResumeText.includes("user user feedback"),
    "Must not create duplicate user wording",
  );
  assert(
    applied.appliedChanges.length >= 1,
    "At least one valid approved change should apply",
  );
});
