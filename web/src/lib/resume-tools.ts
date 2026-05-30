/**
 * Resume tools match pool — keep in sync with
 * supabase/functions/_shared/normalize_parsed_resume.ts
 */

import type { ParsedResume } from "@/lib/types";

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Subset of SOFTWARE_IN_SKILL_RE in normalize_parsed_job.ts */
const SOFTWARE_IN_SKILL_RE =
  /^(adobe|figma|sketch|framer|miro|jira|slack|notion|webflow|shopify|wordpress|blender|lottie|after effects|premiere|photoshop|illustrator|invision|zeplin|protopie|principle|amplitude|mixpanel|docker|kubernetes|terraform|react|vue|angular|typescript|javascript|python|node\.?js|aws|gcp|azure|github|gitlab|rive|spline|cinema 4d|c4d|xd|html|css|tailwind|clickup)/i;

function isLikelyToolToken(token: string): boolean {
  const n = normalizeKey(token);
  if (!n || n.length > 48) return false;
  return SOFTWARE_IN_SKILL_RE.test(n);
}

/** Tools used for Tools coverage UI (includes tools misclassified as skills). */
export function resumeToolsMatchPool(resume?: ParsedResume | null): string[] {
  if (!resume) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const label = raw.trim();
    const key = normalizeKey(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };

  for (const t of resume.tools ?? []) add(t);
  for (const s of resume.skills ?? []) {
    if (isLikelyToolToken(s)) add(s);
  }

  return out;
}
