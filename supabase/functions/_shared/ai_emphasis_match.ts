// Keep in sync with web/src/lib/ai-emphasis-match.ts

import type { ParsedJob } from "./types.ts";

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const key = normalize(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function inferAiMaturity(signals: string[]): number | null {
  if (signals.length === 0) return null;
  const text = signals.map(normalize).join(" ");

  if (/ai[- ]?native|agentic|llm product|foundation model|genai[- ]?first/.test(text)) {
    return 100;
  }
  if (/ai[- ]?heavy|heavy ai|copilot|generative ai|genai/.test(text)) {
    return 75;
  }
  if (/ai[- ]?assisted|ml[- ]?assisted|chatgpt|claude|openai|prompt/.test(text)) {
    return 50;
  }
  if (/ai|machine learning|ml|llm|rag/.test(text)) {
    return 25;
  }
  return 0;
}

const AI_PHRASE_PATTERNS: RegExp[] = [
  /\bai[- ]?native\b/gi,
  /\bai[- ]?powered\b/gi,
  /\bai[- ]?assisted(?:\s+\w+){0,2}/gi,
  /\bai[- ]?driven\b/gi,
  /\bai[- ]?heavy\b/gi,
  /\bai interaction patterns?\b/gi,
  /\bai[- ]?driven experiences?\b/gi,
  /\bai copilots?(?:\s*\/\s*chat interfaces?)?/gi,
  /\bai\/copilot\/chat[- ]based interfaces?\b/gi,
  /\bai saas products?\b/gi,
  /\bai products?\b/gi,
  /\bgenerative ai\b/gi,
  /\bllm integration\b/gi,
  /\bchatgpt\b/gi,
  /\bcopilot\b/gi,
];

export function extractAiRequirementsFromJobText(
  jobText: string | null | undefined,
): string[] {
  const text = jobText?.trim();
  if (!text) return [];

  const found: string[] = [];
  for (const pattern of AI_PHRASE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const phrase = match[0]?.trim().replace(/\s+and$/i, "");
      if (phrase) found.push(phrase);
    }
  }

  return dedupeLabels(found);
}

function extractAiSignalSnippets(jobText: string, max = 16): string[] {
  const snippets: string[] = [];
  const chunks = jobText.split(/[\n.;•]+/);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.length < 4) continue;
    if (
      /\bai\b|\bllm\b|\bcopilot\b|\bgenai\b|\bgenerative ai\b|\bmachine learning\b/i.test(
        trimmed,
      )
    ) {
      snippets.push(trimmed.slice(0, 160));
    }
  }
  return snippets.slice(0, max);
}

export function enrichAiEmphasisFromJobText(
  parsed: ParsedJob,
  jobText: string | null | undefined,
): Pick<ParsedJob, "aiRequirements" | "aiMaturityLevel"> {
  const text = jobText?.trim() ?? "";
  const fromText = extractAiRequirementsFromJobText(text);
  const mergedRequirements = dedupeLabels([
    ...(parsed.aiRequirements ?? []),
    ...fromText,
  ]);

  const maturityFromParse = parsed.aiMaturityLevel ?? null;
  const maturityFromReqs = inferAiMaturity(mergedRequirements);
  const maturityFromBody =
    mergedRequirements.length === 0 && text
      ? inferAiMaturity(extractAiSignalSnippets(text))
      : null;

  return {
    aiRequirements: mergedRequirements,
    aiMaturityLevel:
      maturityFromParse ??
      maturityFromReqs ??
      maturityFromBody,
  };
}
