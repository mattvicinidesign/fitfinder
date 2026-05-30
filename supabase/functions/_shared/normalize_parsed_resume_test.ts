import { assertEquals } from "jsr:@std/assert@1";
import { normalizeParsedResume } from "./normalize_parsed_resume.ts";
import type { ParsedResume } from "./types.ts";

Deno.test("normalizeParsedResume moves Figma from skills to tools", () => {
  const parsed: ParsedResume = {
    skills: ["User Research", "Figma", "Design Systems"],
    industries: [],
    workHistory: [],
    aiExperience: [],
    tools: [],
    archetypes: [],
  };
  const out = normalizeParsedResume(parsed);
  assertEquals(out.tools.includes("Figma"), true);
  assertEquals(out.skills.includes("Figma"), false);
  assertEquals(out.skills.includes("User Research"), true);
});

Deno.test("normalizeParsedResume extracts tools from resume text", () => {
  const parsed: ParsedResume = {
    skills: ["UX"],
    industries: [],
    workHistory: [],
    aiExperience: [],
    tools: [],
    archetypes: [],
  };
  const text = "Tools: Figma, Slack, and ClickUp daily.";
  const out = normalizeParsedResume(parsed, text);
  assertEquals(out.tools.includes("Figma"), true);
  assertEquals(out.tools.includes("Slack"), true);
  assertEquals(out.tools.includes("ClickUp"), true);
});
