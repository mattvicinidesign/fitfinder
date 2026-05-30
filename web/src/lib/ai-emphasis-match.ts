import type { ParsedJob, ParsedResume } from "@/lib/types";

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferAiMaturity(signals: string[]): number | null {
  if (signals.length === 0) return null;
  const text = signals.map(normalize).join(" ");

  if (/ai[- ]?native|agentic|llm product|foundation model|genai[- ]?first/.test(text)) {
    return 100;
  }
  if (/ai[- ]?heavy|heavy ai|copilot|generative ai|genai/.test(text)) return 75;
  if (/ai[- ]?assisted|ml[- ]?assisted|chatgpt|claude|openai|prompt/.test(text)) {
    return 50;
  }
  if (/ai|machine learning|ml|llm|rag/.test(text)) return 25;
  return 0;
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

export function buildAiEmphasisDetail(
  parsedJob?: ParsedJob,
  parsedResume?: ParsedResume | null,
): AiEmphasisDetail | null {
  if (!parsedJob) return null;

  const jobSignals = parsedJob.aiRequirements ?? [];
  const jobMaturity = parsedJob.aiMaturityLevel ?? inferAiMaturity(jobSignals);

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
        ? [`AI maturity ~${jobMaturity}% (inferred from posting)`]
        : [];

  const items: AiRequirementItem[] = requirements.map((label) => {
    const norm = normalize(label);
    const resumeMatch = norm ? findMatch(norm, resumeTokens) : null;
    return { label: label.trim(), matched: resumeMatch !== null, resumeMatch };
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
