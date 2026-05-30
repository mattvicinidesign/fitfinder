import { assertEquals } from "jsr:@std/assert@1";
import {
  extractToolsFromJobText,
  getBonusRegionTexts,
  normalizeParsedJob,
} from "./normalize_parsed_job.ts";
import type { ParsedJob } from "./types.ts";

Deno.test("getBonusRegionTexts captures line-based bonus blocks", () => {
  const text = `Requirements
Figma required

Bonuses
After Effects
Lottie animations`;
  const regions = getBonusRegionTexts(text);
  assertEquals(regions.some((r) => r.toLowerCase().includes("after effects")), true);
});

Deno.test("extractToolsFromJobText finds bonus section tools", () => {
  const text = `
Requirements: Figma, strong UX.

Bonuses:
- After Effects experience
- Lottie animations
- Blender a plus
`;
  const tools = extractToolsFromJobText(text);
  assertEquals(tools.includes("Figma"), true);
  assertEquals(tools.includes("After Effects"), true);
  assertEquals(tools.includes("Lottie"), true);
  assertEquals(tools.includes("Blender"), true);
});

Deno.test("normalizeParsedJob moves software from skills to toolRequirements", () => {
  const parsed: ParsedJob = {
    skills: ["User Research", "After Effects", "Prototyping"],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: ["Figma"],
    aiRequirements: [],
  };
  const jobText = "Nice to have: Lottie and Blender";
  const out = normalizeParsedJob(parsed, jobText);
  assertEquals(out.skills.includes("User Research"), true);
  assertEquals(out.skills.includes("After Effects"), false);
  assertEquals(out.toolRequirements.includes("Figma"), true);
  assertEquals(out.toolRequirements.includes("After Effects"), true);
  assertEquals(out.toolRequirements.includes("Lottie"), true);
  assertEquals(out.toolRequirements.includes("Blender"), true);
  assertEquals(out.bonusToolRequirements?.includes("Lottie"), true);
  assertEquals(out.bonusToolRequirements?.includes("Blender"), true);
  assertEquals(out.bonusToolRequirements?.includes("Figma"), false);
});
