import type { ParsedJob, ParsedResume } from "@/lib/types";

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

/** Pull explicit AI emphasis phrases from a raw posting (title, summary, scope). */
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

/** Backfill aiRequirements / aiMaturityLevel when the LLM parse omits them. */
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

function findMatch(reqNorm: string, tokens: string[]): string | null {
  for (const raw of tokens) {
    const norm = normalize(raw);
    if (!norm) continue;
    if (norm === reqNorm || norm.includes(reqNorm) || reqNorm.includes(norm)) {
      return raw.trim();
    }
  }
  return null;
}

export interface AiRequirementItem {
  label: string;
  matched: boolean;
  resumeMatch: string | null;
}

export interface AiEmphasisDetail {
  jobMaturity: number | null;
  resumeMaturity: number | null;
  jobRequirements: string[];
  items: AiRequirementItem[];
  matched: AiRequirementItem[];
  missing: AiRequirementItem[];
  summary: string;
}

export function jobHasAiEmphasis(
  parsedJob?: ParsedJob,
  jobDescription?: string | null,
): boolean {
  if (!parsedJob && !jobDescription?.trim()) return false;
  const base = parsedJob ?? {
    skills: [],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
  const enriched = enrichAiEmphasisFromJobText(base, jobDescription);
  return (
    enriched.aiRequirements.length > 0 ||
    (enriched.aiMaturityLevel != null && enriched.aiMaturityLevel >= 25)
  );
}

/** Preference match: posting emphasizes AI and the candidate has AI experience. */
export function isAiEmphasisPreferenceMatch(
  detail: AiEmphasisDetail | null,
): boolean {
  if (!detail) return false;

  const jobHasEmphasis =
    detail.jobRequirements.length > 0 ||
    (detail.jobMaturity != null && detail.jobMaturity >= 25);
  if (!jobHasEmphasis) return false;

  if (detail.matched.length > 0) return true;

  return detail.resumeMaturity != null && detail.resumeMaturity >= 25;
}

export function buildAiEmphasisDetail(
  parsedJob?: ParsedJob,
  parsedResume?: ParsedResume | null,
  jobDescription?: string | null,
): AiEmphasisDetail | null {
  if (!parsedJob && !jobDescription?.trim()) return null;

  const base = parsedJob ?? {
    skills: [],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
  const enriched = enrichAiEmphasisFromJobText(base, jobDescription);

  const jobSignals = enriched.aiRequirements;
  const jobMaturity =
    enriched.aiMaturityLevel ?? inferAiMaturity(jobSignals);

  if (jobMaturity === null && jobSignals.length === 0) return null;

  const resumeTokens = [
    ...(parsedResume?.aiExperience ?? []),
    ...(parsedResume?.skills ?? []),
    ...(parsedResume?.tools ?? []),
  ];
  const resumeMaturity = inferAiMaturity(resumeTokens);

  const requirements =
    jobSignals.length > 0
      ? jobSignals
      : jobMaturity != null
        ? [`AI emphasis ~${jobMaturity}% (from posting)`]
        : [];

  const items: AiRequirementItem[] = requirements.map((label) => {
    const norm = normalize(label);
    const resumeMatch = norm ? findMatch(norm, resumeTokens) : null;
    const maturityLabel = label.includes("(from posting)");
    const matchedByMaturity =
      maturityLabel &&
      resumeMaturity != null &&
      jobMaturity != null &&
      resumeMaturity >= jobMaturity - 35;
    return {
      label: label.trim(),
      matched: resumeMatch !== null || matchedByMaturity,
      resumeMatch,
    };
  });

  let summary: string;
  if (resumeMaturity == null) {
    summary = "Posting signals AI expectations; no AI experience parsed on your resume.";
  } else if (jobMaturity != null) {
    summary = `Posting AI maturity ~${jobMaturity}% · yours ~${resumeMaturity}% (from resume signals).`;
  } else {
    summary = `Your AI maturity from resume signals: ~${resumeMaturity}%.`;
  }

  return {
    jobMaturity,
    resumeMaturity,
    jobRequirements: jobSignals,
    items,
    matched: items.filter((i) => i.matched),
    missing: items.filter((i) => !i.matched),
    summary,
  };
}
