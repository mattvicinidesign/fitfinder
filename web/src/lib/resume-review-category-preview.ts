import type {
  ResumeReviewCategoryKey,
  ResumeReviewFinding,
  ResumeReviewFindingStatus,
} from "@/lib/types";

/** Minimum list length in dev so category detail scroll can be exercised. */
export const RESUME_REVIEW_CATEGORY_SECTION_PREVIEW_MIN = 12;

const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

const STRENGTH_SEEDS: Record<ResumeReviewCategoryKey, string[]> = {
  content: [
    "Experience bullets highlight relevant product and design work.",
    "Skills section includes tools recruiters search for.",
    "Summary states your role and seniority clearly.",
    "Achievements mention cross-functional collaboration.",
    "Keywords align with the types of roles you target.",
    "Impact is described with scope, not just task lists.",
    "Portfolio link is easy to find near the top.",
    "Education and certifications are complete and dated.",
    "Each role includes company context and your title.",
    "Technical and soft skills are balanced in the skills block.",
    "Resume length stays focused on recent, relevant experience.",
    "Tone is professional and consistent across sections.",
  ],
  structure: [
    "Sections are clearly defined and easy to navigate.",
    "Consistent formatting throughout the document.",
    "Margins and spacing make the page easy to scan.",
    "Section headings stand out from body text.",
    "Date formatting is uniform across roles.",
    "Bullet alignment is clean in every section.",
    "Contact block is compact and readable.",
    "Page breaks do not split sections awkwardly.",
    "Font sizes create a clear visual hierarchy.",
    "White space separates sections without feeling empty.",
    "Columns and grids line up on every page.",
    "File exports cleanly to PDF without layout shifts.",
  ],
  ats: [
    "Standard section headings parse reliably in ATS tools.",
    "Job titles and employers appear in plain text.",
    "Skills use common phrasing recruiters filter on.",
    "No critical content is trapped inside tables.",
    "Contact details use a simple, machine-readable layout.",
    "File type and encoding are ATS-friendly.",
    "Role keywords appear in context, not only in a keyword block.",
    "Dates use a consistent format ATS can interpret.",
    "Section order follows a conventional resume pattern.",
    "Acronyms are spelled out at least once.",
    "Links use readable labels instead of raw URLs in body text.",
    "Headers and footers do not hide important content.",
  ],
  completeness: [
    "Contact information includes email and phone.",
    "LinkedIn or portfolio URL is present.",
    "Work history covers your recent roles.",
    "Education section lists degree and institution.",
    "Skills section is populated with core competencies.",
    "Location or work authorization is stated when relevant.",
    "Certifications appear when they support your target role.",
    "Each role includes start and end dates.",
    "Professional summary or headline is included.",
    "Volunteer or side projects are listed when relevant.",
    "Awards or publications are included when applicable.",
    "Languages or tools are listed when they differentiate you.",
  ],
};

const NEEDS_IMPROVEMENT_SEEDS: Record<ResumeReviewCategoryKey, string[]> = {
  content: [
    "Several bullets describe duties instead of measurable outcomes.",
    "Summary could be tighter and more role-specific.",
    "Some skills listed are not evidenced in your experience bullets.",
    "A few bullets lack strong action verbs at the start.",
    "Impact metrics are missing from key product launches.",
    "Older roles include more detail than your recent work.",
    "One section repeats phrasing used elsewhere on the resume.",
    "Quantified results are uneven across your last three roles.",
    "Portfolio examples are referenced but not tied to outcomes.",
    "Leadership scope is implied but not stated clearly.",
    "Some bullets are long enough to split into two stronger lines.",
    "Keywords for your target level are underrepresented in bullets.",
  ],
  structure: [
    "Lacks bullet point consistency in some areas.",
    "Visual hierarchy between headings could be stronger.",
    "Spacing between sections is uneven on page one.",
    "Some dates are harder to scan than others.",
    "Skills block competes visually with experience.",
    "One section uses a different bullet style.",
    "Contact details take more space than necessary.",
    "A dense paragraph could become scannable bullets.",
    "Secondary sections appear before core experience.",
    "Indentation differs between two roles.",
    "Font weight for subtitles is too close to body text.",
    "Page two starts mid-section without a clear break.",
  ],
  ats: [
    "Important keywords from your target role are underused.",
    "One section label may not parse in every ATS.",
    "Graphics or icons sit near text ATS may skip.",
    "Job title phrasing differs from common market titles.",
    "Skills appear only once and not near related experience.",
    "Abbreviations are used without a spelled-out version.",
    "A table layout may hide text from some parsers.",
    "File name does not include your name or role.",
    "Some bullets omit tools recruiters filter on.",
    "Keyword density is low in your most recent role.",
    "Contact header uses columns some parsers misread.",
    "Role-specific terms from the job family are missing.",
  ],
  completeness: [
    "Portfolio link is missing from the header area.",
    "One recent role omits month or year on dates.",
    "Certifications section is empty despite relevant credentials.",
    "No professional summary or headline is present.",
    "GitHub or case-study link is not included.",
    "Location information is missing for remote-role searches.",
    "Volunteer work that supports your story is not listed.",
    "Languages section is absent though you work globally.",
    "Tools section does not match tools named in experience.",
    "Education entry is missing graduation year.",
    "Contact email uses an non-professional address.",
    "Freelance or contract work is not labeled clearly.",
  ],
};

const IMPROVEMENT_TITLE_SEEDS: Record<ResumeReviewCategoryKey, string[]> = {
  content: [
    "Add quantifiable metrics to skills",
    "Rewrite duty bullets as outcome bullets",
    "Tighten the professional summary",
    "Align skills with evidenced experience",
    "Strengthen action verbs in recent roles",
    "Show scope for cross-functional work",
    "Connect portfolio work to business results",
    "Reduce repetition across sections",
    "Highlight leadership and ownership",
    "Target keywords for your next role level",
    "Split overloaded bullets into two lines",
    "Prioritize recent roles over older detail",
  ],
  structure: [
    "Enhance visual hierarchy",
    "Standardize bullet formatting",
    "Rebalance section spacing",
    "Simplify the contact block",
    "Reorder sections for faster scanning",
    "Unify date formatting",
    "Reduce density in paragraph sections",
    "Strengthen heading contrast",
    "Fix inconsistent indentation",
    "Move skills below core experience",
    "Improve page-break placement",
    "Align subtitle styling across roles",
  ],
  ats: [
    "Add role-specific keywords",
    "Rename sections for ATS parsing",
    "Move keywords into experience bullets",
    "Spell out acronyms on first use",
    "Replace table layouts with plain text",
    "Match common job title phrasing",
    "Repeat core tools near relevant roles",
    "Remove text trapped in graphics",
    "Use a descriptive file name",
    "Increase keyword coverage in recent role",
    "Simplify header layout for parsers",
    "Mirror language from target job posts",
  ],
  completeness: [
    "Add portfolio link to header",
    "Fill in missing employment dates",
    "Add a professional summary",
    "List relevant certifications",
    "Include GitHub or case-study URL",
    "Add location or remote preference",
    "Document freelance and contract roles",
    "Complete the languages section",
    "Add graduation year to education",
    "Expand tools to match experience",
    "Include volunteer work when relevant",
    "Use a professional contact email",
  ],
};

const NEXT_STEP_SEEDS: Record<ResumeReviewCategoryKey, string[]> = {
  content: [
    "Include metrics to demonstrate impact in previous roles.",
    "Start each bullet with a strong action verb.",
    "Rewrite task lines using the XYZ formula.",
    "Remove skills that are not supported by your experience.",
    "Add one quantified result per recent role.",
    "Trim the summary to two lines focused on your target role.",
    "Tie portfolio projects to user or business outcomes.",
    "Replace passive phrasing with ownership language.",
    "Mirror keywords from job posts you are targeting.",
    "Split any bullet longer than two lines.",
    "Move your strongest achievements to the top of each role.",
    "Delete outdated tools that no longer support your story.",
  ],
  structure: [
    "Use headings and subheadings to improve readability.",
    "Apply one bullet style across the entire document.",
    "Increase spacing before major section breaks.",
    "Right-align or consistently place dates for scanning.",
    "Move contact details into a single compact row.",
    "Convert dense paragraphs into three to five bullets.",
    "Put experience before skills and tools.",
    "Use bold only for job titles and section headers.",
    "Check PDF export on desktop and mobile.",
    "Keep page one focused on your last ten years.",
    "Align bullet indents in every section.",
    "Preview the layout at 100% zoom before sending.",
  ],
  ats: [
    "Add missing keywords from your target job description.",
    "Rename non-standard section headers to conventional labels.",
    "Place each core skill in a related experience bullet.",
    "Export a plain DOCX version for conservative ATS portals.",
    "Remove icons or text boxes that sit over copy.",
    "Use the exact job title phrasing common in your market.",
    "Repeat critical tools in both skills and experience.",
    "Save the file as Firstname-Lastname-Role.pdf.",
    "Spell out acronyms once before using the short form.",
    "Paste resume text into a plain editor to check parsing.",
    "Avoid headers and footers for contact information.",
    "Test the file in a free ATS scanner before applying.",
  ],
  completeness: [
    "Add your portfolio URL next to email and phone.",
    "Fill in month and year for every role.",
    "Write a two-line summary under your name.",
    "List certifications that support your target role.",
    "Add GitHub, Behance, or case-study links where relevant.",
    "State city, region, or remote preference clearly.",
    "Label contract and freelance work in job titles.",
    "Include languages if you collaborate across regions.",
    "Match tools in the skills block to each role.",
    "Add graduation year and degree to education.",
    "Use a professional email address in the header.",
    "Add volunteer projects that reinforce your expertise.",
  ],
};

function padList<T>(
  items: T[],
  min: number,
  pickSeed: (index: number) => T,
): T[] {
  if (!isDev || items.length >= min) return items;
  const out = [...items];
  let i = 0;
  while (out.length < min) {
    out.push(pickSeed(i));
    i += 1;
  }
  return out;
}

function finding(label: string, status: ResumeReviewFindingStatus): ResumeReviewFinding {
  return { label, status };
}

export function expandPreviewStrengths(
  findings: ResumeReviewFinding[],
  categoryKey: ResumeReviewCategoryKey,
): ResumeReviewFinding[] {
  const strengths = findings.filter((item) => item.status === "pass");
  const seeds = STRENGTH_SEEDS[categoryKey];
  return padList(strengths, RESUME_REVIEW_CATEGORY_SECTION_PREVIEW_MIN, (index) =>
    finding(seeds[index % seeds.length]!, "pass"),
  );
}

export function expandPreviewNeedsImprovementFindings(
  findings: ResumeReviewFinding[],
  categoryKey: ResumeReviewCategoryKey,
): ResumeReviewFinding[] {
  const issues = findings.filter((item) => item.status !== "pass");
  const seeds = NEEDS_IMPROVEMENT_SEEDS[categoryKey];
  return padList(issues, RESUME_REVIEW_CATEGORY_SECTION_PREVIEW_MIN, (index) =>
    finding(seeds[index % seeds.length]!, "warn"),
  );
}

export function expandPreviewImprovementTitles(
  titles: string[],
  categoryKey: ResumeReviewCategoryKey,
): string[] {
  const seeds = IMPROVEMENT_TITLE_SEEDS[categoryKey];
  return padList(titles, RESUME_REVIEW_CATEGORY_SECTION_PREVIEW_MIN, (index) =>
    seeds[index % seeds.length]!,
  );
}

export function expandPreviewNextSteps(
  steps: string[],
  categoryKey: ResumeReviewCategoryKey,
): string[] {
  const seeds = NEXT_STEP_SEEDS[categoryKey];
  return padList(steps, RESUME_REVIEW_CATEGORY_SECTION_PREVIEW_MIN, (index) =>
    seeds[index % seeds.length]!,
  );
}
