import { assertEquals } from "jsr:@std/assert@1";
import {
  enrichAiEmphasisFromJobText,
  extractAiRequirementsFromJobText,
} from "./ai_emphasis_match.ts";

const SENIOR_UX_SNIPPET = `Senior UX Strategist for AI-Powered AdTech SaaS Platform
Posted 4 weeks ago
Worldwide

Summary
We are an AI-native media and technology company.
AI-assisted workflows and AI interaction patterns.`;

Deno.test("extractAiRequirementsFromJobText finds title and body phrases", () => {
  const reqs = extractAiRequirementsFromJobText(SENIOR_UX_SNIPPET);
  assertEquals(reqs.includes("AI-native"), true);
  assertEquals(reqs.some((r) => /AI-Powered/i.test(r)), true);
});

Deno.test("enrichAiEmphasisFromJobText backfills when LLM parse is empty", () => {
  const enriched = enrichAiEmphasisFromJobText(
    {
      skills: [],
      industries: [],
      workflows: [],
      compensation: null,
      toolRequirements: [],
      aiRequirements: [],
    },
    SENIOR_UX_SNIPPET,
  );
  assertEquals(enriched.aiRequirements.length > 0, true);
  assertEquals(enriched.aiMaturityLevel, 100);
});
