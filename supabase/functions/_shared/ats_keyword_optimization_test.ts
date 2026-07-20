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

Deno.test("ATS optimization: apply preserves structure and bullet count", () => {
  const original = [
    "• Helped design onboarding",
    "• Made prototypes for research",
  ].join("\n");

  const scan = scanResumeWithDiscovery(original, 5);
  const approvedIndices = scan.keywordChanges.map((_, index) => index);
  const applied = buildOptimizedResumeText(original, scan.keywordChanges, approvedIndices);

  assertEquals(applied.reverted, false);
  assert(applied.appliedChanges.length > 0);
  assertEquals(
    applied.optimizedResumeText.split("\n").length,
    original.split("\n").length,
  );
  for (const line of applied.optimizedResumeText.split("\n")) {
    assert(isBulletLine(line));
  }
});
