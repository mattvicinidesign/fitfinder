import type { ParsedResume } from "../types.ts";

/** Serialize parsed resume into plain text when storage text is unavailable. */
export function parsedResumeToText(resume: ParsedResume): string {
  const lines: string[] = [];

  if (resume.roleTitle?.trim()) lines.push(`Title: ${resume.roleTitle.trim()}`);

  for (const role of resume.workHistory ?? []) {
    const title = role.title?.trim() ?? "Role";
    const company = role.company?.trim();
    const dates = [role.startDate, role.endDate ?? "Present"].filter(Boolean).join(" – ");
    lines.push(
      [title, company ? `at ${company}` : "", dates ? `(${dates})` : ""]
        .filter(Boolean)
        .join(" "),
    );
    if (role.summary?.trim()) lines.push(role.summary.trim());
  }

  const listSections: [string, string[]][] = [
    ["Skills", resume.skills ?? []],
    ["Tools", resume.tools ?? []],
    ["Industries", resume.industries ?? []],
    ["AI Experience", resume.aiExperience ?? []],
    ["Archetypes", resume.archetypes ?? []],
    ["Software Models", resume.softwareModels ?? []],
  ];

  for (const [label, items] of listSections) {
    const filtered = items.map((i) => i.trim()).filter(Boolean);
    if (filtered.length) lines.push(`${label}: ${filtered.join(", ")}`);
  }

  return lines.join("\n").trim();
}
