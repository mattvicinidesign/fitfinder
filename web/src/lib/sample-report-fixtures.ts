import {
  SEMANTIC_CATEGORY_LABELS,
  SEMANTIC_CATEGORY_WEIGHTS,
} from "@/lib/semantic-report";
import type {
  AnalysisResult,
  CompetencyMatchResult,
  ParsedJob,
  ParsedResume,
  Recommendation,
  SemanticCategoryKey,
  SemanticCategoryScore,
  SemanticMatchReport,
} from "@/lib/types";

const SAMPLE_RESUME: ParsedResume = {
  skills: [
    "Figma",
    "User Research",
    "Product Strategy",
    "Design Systems",
    "Prototyping",
  ],
  industries: ["SaaS", "MarTech", "AdTech"],
  workHistory: [
    {
      title: "Senior Product Designer",
      company: "Northline",
      startDate: "2020",
      endDate: null,
      summary: "Led B2B SaaS product design and design systems.",
    },
  ],
  aiExperience: ["ChatGPT", "Figma AI", "AI-assisted workflows"],
  tools: ["Figma", "Amplitude", "Jira", "Notion"],
  archetypes: ["Product Designer"],
  softwareModels: ["B2B SaaS", "Enterprise Software"],
  country: "United States",
  timezone: "America/Los_Angeles",
  roleTitle: "Product Designer",
};

export interface SampleReportInput {
  jobTitle: string;
  companyName: string;
  hireArea: string;
  fitScore: number;
  qualificationScore: number;
  confidenceScore: number;
  recommendation: Recommendation;
  recommendationLabel: string;
}

function buildJobDescription(title: string, company: string, hireArea: string): string {
  return `${title} at ${company}

We are looking for an experienced designer to partner on product work.

About the client
${company}
United States
San Francisco 10:00 AM
4.9 of 5 reviews
$72.00 /hr avg hourly rate paid
30+ hrs/week
3 to 6 months
${hireArea}
`;
}

function buildParsedJob(title: string, hireArea: string): ParsedJob {
  return {
    skills: ["Figma", "User Research", "Design Systems", "Prototyping"],
    industries: ["SaaS", "MarTech"],
    workflows: ["Dashboarding", "User flows", "Reporting"],
    compensation: { min: 65, max: 95, currency: "USD", period: "hour" },
    toolRequirements: ["Figma", "Amplitude"],
    bonusToolRequirements: [],
    aiRequirements: ["AI-assisted design"],
    roleTitle: title,
    employerType: "product_company",
    hireTarget: "freelancer",
    postingDetails: {
      datePosted: "4 days ago",
      hireArea,
      clientRating: "4.9 of 5 reviews",
      clientOrigin: "United States",
      clientCity: "San Francisco",
      clientAverageHourlyRate: "$72.00 /hr",
      hoursNeeded: "30+ hrs/week",
      duration: "3 to 6 months",
    },
  };
}

function competency(
  id: string,
  label: string,
  category: SemanticCategoryKey,
  similarityScore: number,
  importance: CompetencyMatchResult["importance"] = "required",
): CompetencyMatchResult {
  const matchKind =
    similarityScore >= 95
      ? "exact"
      : similarityScore >= 80
        ? "strong"
        : similarityScore >= 50
          ? "partial"
          : similarityScore >= 20
            ? "weak"
            : "missing";

  return {
    jobCompetencyId: id,
    jobLabel: label,
    resumeCompetencyId: similarityScore > 0 ? `resume-${id}` : null,
    resumeLabel: similarityScore > 0 ? label : null,
    canonicalLabel: label,
    category,
    importance,
    similarityScore,
    matchKind,
    evidenceCount: similarityScore > 0 ? 2 : 0,
    reasoning:
      similarityScore > 0
        ? `Resume demonstrates ${label} for this role.`
        : `No resume evidence found for ${label}.`,
  };
}

function buildSemanticMatchReport(targetFit: number): SemanticMatchReport {
  const scale = targetFit / 89;
  const scaled = (base: number) => Math.min(100, Math.round(base * scale));
  const contrib = (weight: number, score: number) =>
    Math.round(weight * (score / 100) * 10) / 10;

  const categoryDefs: {
    category: SemanticCategoryKey;
    baseScore: number;
    matched: CompetencyMatchResult[];
    partial: CompetencyMatchResult[];
    missing: CompetencyMatchResult[];
  }[] = [
    {
      category: "skillsTools",
      baseScore: 88,
      matched: [
        competency("c1", "Research", "skillsTools", scaled(95)),
        competency("c2", "UX Execution", "skillsTools", scaled(90)),
        competency("t1", "Product Analytics", "skillsTools", scaled(86)),
        competency("s1", "Communication", "skillsTools", scaled(82)),
      ],
      partial: [
        competency("c3", "Design Systems", "skillsTools", scaled(68), "preferred"),
        competency("t2", "Figma", "skillsTools", scaled(72)),
      ],
      missing: [],
    },
    {
      category: "experience",
      baseScore: 90,
      matched: [competency("e1", "Senior IC scope", "experience", scaled(92))],
      partial: [],
      missing: [],
    },
    {
      category: "responsibilities",
      baseScore: 86,
      matched: [competency("r1", "End-to-end product delivery", "responsibilities", scaled(88))],
      partial: [],
      missing: [],
    },
    {
      category: "domainBackground",
      baseScore: 80,
      matched: [competency("d1", "SaaS", "domainBackground", scaled(85))],
      partial: [
        competency("l1", "Cross-functional influence", "domainBackground", scaled(62)),
      ],
      missing: [
        competency("ed1", "Formal design certification", "domainBackground", 0, "bonus"),
      ],
    },
  ];

  const categoryScores: SemanticCategoryScore[] = categoryDefs.map((def) => {
    const score = scaled(def.baseScore);
    const weight = SEMANTIC_CATEGORY_WEIGHTS[def.category];
    return {
      category: def.category,
      label: SEMANTIC_CATEGORY_LABELS[def.category],
      score,
      weight,
      contribution: contrib(weight, score),
      matched: def.matched,
      partial: def.partial,
      missing: def.missing,
      reasoning: `${SEMANTIC_CATEGORY_LABELS[def.category]} scored from normalized competency matches.`,
    };
  });

  const matchedCompetencies = categoryScores.flatMap((c) => c.matched);
  const partialCompetencies = categoryScores.flatMap((c) => c.partial);
  const missingCompetencies = categoryScores.flatMap((c) => c.missing);

  return {
    overallMatchPercent: targetFit,
    categoryScores,
    matchedCompetencies,
    partialCompetencies,
    missingCompetencies,
    strengths: [
      "Research (95%)",
      "UX Execution (90%)",
      "SaaS domain familiarity (85%)",
    ],
    weaknesses: [
      "Design Systems (68% — preferred)",
      "Formal design certification (missing — bonus)",
    ],
    scoreReasoning: `Overall match ${targetFit}% from weighted semantic categories across experience, skills & tools, responsibilities, and domain & background.`,
    resumeCanonical: {
      competencies: [],
      seniority: "Senior",
      yearsExperience: 8,
      industries: ["SaaS", "MarTech"],
      accomplishments: ["Shipped analytics dashboard"],
      quantifiedImpact: ["Increased activation 12%"],
    },
    jobCanonical: {
      competencies: [],
      seniority: "Senior",
      yearsExperience: 6,
      industries: ["SaaS"],
      accomplishments: [],
      quantifiedImpact: [],
    },
  };
}

/** Full analysis payload — same shape as a live analyze response (web source of truth). */
export function buildSampleAnalysisResult(input: SampleReportInput): AnalysisResult {
  const parsedJob = buildParsedJob(input.jobTitle, input.hireArea);
  const jobDescription = buildJobDescription(
    input.jobTitle,
    input.companyName,
    input.hireArea,
  );
  const semanticMatchReport = buildSemanticMatchReport(input.fitScore);

  return {
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    parsedJob,
    parsedResume: SAMPLE_RESUME,
    jobDescription,
    score: {
      qualificationScore: input.qualificationScore,
      confidenceScore: input.confidenceScore,
      careerFitAdjustment: 0,
      fitScore: input.fitScore,
      recommendation: input.recommendation,
      recommendationLabel: input.recommendationLabel,
      scoringMode: "registered",
      categoryBreakdown: [],
      unknownCategories: [],
      explanation: semanticMatchReport.scoreReasoning,
      strengths: semanticMatchReport.strengths,
      gaps: semanticMatchReport.weaknesses,
      positiveSignalsFound: semanticMatchReport.strengths,
      negativeSignalsFound: semanticMatchReport.weaknesses,
      semanticMatchReport,
    },
    narrative: {
      strengths: ["Relevant product design experience."],
      gaps: ["Consider highlighting systems work."],
      recommendations: ["Tailor your proposal to the posting tone."],
      positiveSignals: ["B2B SaaS background matches the team."],
      negativeSignals: [],
    },
    postingContext: {
      employerType: "product_company",
      hireTarget: "freelancer",
      label: "Product company hiring a Freelancer",
      detail: null,
      engagementDuration: "ongoing",
      engagementPath: "contract",
      payStructure: "hourly",
      badges: ["Contract", "Hourly"],
    },
  };
}
