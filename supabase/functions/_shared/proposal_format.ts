import type { ParsedResume, ProposalSections, RelevantProject } from "./types.ts";
import {
  MAX_RELEVANT_PROJECTS,
  formatPortfolioLine,
  normalizePortfolioUrl,
} from "./portfolio_url.ts";

export const MIN_RELEVANT_PROJECTS = 2;

const PORTFOLIO_LINE = /^🔗 Portfolio:[^\n]*$/;
const LEGACY_PORTFOLIO_LINE = /^👤[^\n]*$/;
const SECTION_MARKERS = [
  "🚀 Relevant Projects",
  "💎 Core Expertise",
  "⚙️ How I Work",
  "📦 What I Deliver",
  "🤝 Closing",
];

export function splitIntroductionParagraphs(introduction: string): string[] {
  return introduction
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

/** Insert portfolio after the opening intro paragraph (before paragraph 2). */
export function compileIntroductionWithPortfolio(
  introduction: string,
  portfolioUrl: string | null | undefined,
): string {
  const paragraphs = splitIntroductionParagraphs(introduction);
  if (!portfolioUrl?.trim()) {
    return paragraphs.join("\n\n");
  }
  const portfolioLine = formatPortfolioLine(portfolioUrl.trim());
  if (paragraphs.length === 0) return portfolioLine;
  if (paragraphs.length === 1) {
    return `${paragraphs[0]}\n\n${portfolioLine}`;
  }
  return [paragraphs[0], portfolioLine, ...paragraphs.slice(1)].join("\n\n");
}

function formatProjectBlock(project: RelevantProject): string[] {
  const lines = [
    `• ${project.name}`,
    `  Why It's Relevant: ${project.whyRelevant}`,
  ];
  if (project.keyContributions.length > 0) {
    lines.push("  Key Contributions:");
    for (const item of project.keyContributions) {
      lines.push(`  • ${item}`);
    }
  }
  return lines;
}

export function ensureMinimumRelevantProjects(
  projects: RelevantProject[],
  resume: ParsedResume,
): RelevantProject[] {
  const out = [...projects];
  const used = new Set(out.map((p) => p.name.toLowerCase()));

  for (const item of resume.workHistory) {
    if (out.length >= MIN_RELEVANT_PROJECTS) break;
    const name = item.company.trim();
    if (!name || used.has(name.toLowerCase())) continue;
    used.add(name.toLowerCase());

    const summary = item.summary?.trim() ?? "";
    const whyRelevant = summary
      ? summary.split(/[.!?]/).find((s) => s.trim().length > 20)?.trim() ??
        summary.slice(0, 160)
      : `Relevant ${item.title} experience at ${name}.`;

    const keyContributions = summary
      ? summary
          .split(/[.;]\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 12)
          .slice(0, 3)
      : [`${item.title} at ${name}`];

    out.push({ name, whyRelevant, keyContributions });
  }

  return out.slice(0, MAX_RELEVANT_PROJECTS);
}

/** Compile structured proposal sections into plain text for copy / PDF export. */
export function compileProposalText(sections: ProposalSections): string {
  const blocks: string[] = [];

  blocks.push("Hi There 👋");
  blocks.push("");
  blocks.push(
    compileIntroductionWithPortfolio(
      sections.introduction,
      sections.portfolioUrl,
    ),
  );

  const projects = sections.relevantProjects.slice(0, MAX_RELEVANT_PROJECTS);
  if (projects.length > 0) {
    blocks.push("");
    blocks.push("🚀 Relevant Projects");
    blocks.push("");
    projects.forEach((project, idx) => {
      blocks.push(...formatProjectBlock(project));
      if (idx < projects.length - 1) blocks.push("");
    });
  }

  if (sections.coreExpertise.length > 0) {
    blocks.push("");
    blocks.push("💎 Core Expertise");
    blocks.push("");
    for (const item of sections.coreExpertise) {
      blocks.push(`• ${item}`);
    }
  }

  if (sections.howIWork.length > 0) {
    blocks.push("");
    blocks.push("⚙️ How I Work");
    blocks.push("");
    for (const item of sections.howIWork) {
      blocks.push(`• ${item}`);
    }
  }

  if (sections.whatIDeliver.length > 0) {
    blocks.push("");
    blocks.push("📦 What I Deliver");
    blocks.push("");
    for (const item of sections.whatIDeliver) {
      blocks.push(`• ${item}`);
    }
  }

  blocks.push("");
  blocks.push("🤝 Closing");
  blocks.push("");
  blocks.push(sections.closing.trim());

  return blocks.join("\n").trim();
}

function stripPortfolioLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !PORTFOLIO_LINE.test(line.trim()) && !LEGACY_PORTFOLIO_LINE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Move portfolio into the intro — after paragraph 1, before paragraph 2. */
export function injectPortfolioInIntroduction(
  text: string,
  portfolioUrl: string | null | undefined,
): string {
  const url = portfolioUrl?.trim();
  if (!url) return text;

  const header = "Hi There 👋";
  const headerIdx = text.indexOf(header);
  if (headerIdx === -1) return text;

  const beforeHeader = text.slice(0, headerIdx);
  const afterHeader = text.slice(headerIdx + header.length).replace(/^\s*\n/, "");

  let introEnd = afterHeader.length;
  for (const marker of SECTION_MARKERS) {
    const i = afterHeader.indexOf(marker);
    if (i !== -1 && i < introEnd) introEnd = i;
  }

  const introPart = stripPortfolioLines(afterHeader.slice(0, introEnd).trim());
  const rest = afterHeader.slice(introEnd).trimStart();

  const portfolioLine = formatPortfolioLine(normalizePortfolioUrl(url));
  if (introPart.includes(formatPortfolioLine(url)) || introPart.includes(portfolioLine)) {
    return text;
  }

  const recompiled = compileIntroductionWithPortfolio(introPart, url);
  const body = rest ? `${recompiled}\n\n${rest}` : recompiled;
  return `${beforeHeader}${header}\n\n${body}`.trim();
}

export function normalizeRelevantProjects(value: unknown): ProposalSections["relevantProjects"] {
  if (!Array.isArray(value)) return [];
  const out: ProposalSections["relevantProjects"] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const whyRelevant =
      typeof row.whyRelevant === "string" ? row.whyRelevant.trim() : "";
    const keyContributions = Array.isArray(row.keyContributions)
      ? row.keyContributions
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0)
      : [];
    if (!name || !whyRelevant) continue;
    out.push({ name, whyRelevant, keyContributions });
    if (out.length >= MAX_RELEVANT_PROJECTS) break;
  }
  return out;
}

export function normalizeProposalSections(
  value: unknown,
  portfolioFallback: string | null,
): ProposalSections | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  const introduction =
    typeof row.introduction === "string" ? row.introduction.trim() : "";
  const closing = typeof row.closing === "string" ? row.closing.trim() : "";
  if (!introduction || !closing) return null;

  const portfolioUrl =
    typeof row.portfolioUrl === "string" && row.portfolioUrl.trim()
      ? row.portfolioUrl.trim()
      : portfolioFallback;

  return {
    introduction,
    portfolioUrl,
    relevantProjects: normalizeRelevantProjects(row.relevantProjects).slice(
      0,
      MAX_RELEVANT_PROJECTS,
    ),
    coreExpertise: toStringArray(row.coreExpertise),
    howIWork: toStringArray(row.howIWork),
    whatIDeliver: toStringArray(row.whatIDeliver),
    closing,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}
