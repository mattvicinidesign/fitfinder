import type {
  ResumeReviewCategoryKey,
  ResumeReviewImprovement,
  ResumeReviewResult,
} from "@/lib/types";
import {
  FileText,
  LayoutTemplate,
  ListChecks,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

export const RESUME_REVIEW_CATEGORY_KEYS: ResumeReviewCategoryKey[] = [
  "content",
  "structure",
  "ats",
  "completeness",
];

export const RESUME_REVIEW_CATEGORY_LABELS: Record<
  ResumeReviewCategoryKey,
  string
> = {
  content: "Content Quality",
  structure: "Layout & Structure",
  ats: "ATS Compatibility",
  completeness: "Completeness",
};

export function getResumeReviewCategoryLabel(key: ResumeReviewCategoryKey) {
  return RESUME_REVIEW_CATEGORY_LABELS[key];
}

export const RESUME_REVIEW_CATEGORY_ICONS: Record<
  ResumeReviewCategoryKey,
  LucideIcon
> = {
  content: FileText,
  structure: LayoutTemplate,
  ats: ScanSearch,
  completeness: ListChecks,
};

export function getResumeReviewCategoryIcon(key: ResumeReviewCategoryKey) {
  return RESUME_REVIEW_CATEGORY_ICONS[key];
}

export function isResumeReviewCategoryKey(
  value: string,
): value is ResumeReviewCategoryKey {
  return (RESUME_REVIEW_CATEGORY_KEYS as string[]).includes(value);
}

export function getResumeReviewCategory(
  review: ResumeReviewResult,
  key: ResumeReviewCategoryKey,
) {
  return review.categories.find((category) => category.key === key) ?? null;
}

function inferImprovementCategory(
  title: string,
  detail: string | null,
): ResumeReviewCategoryKey | null {
  const text = `${title} ${detail ?? ""}`.toLowerCase();
  if (
    /portfolio|quantified|achievement|action verb|summary|skill|impact|bullet|content|metric/.test(
      text,
    )
  ) {
    return "content";
  }
  if (
    /format|hierarchy|order|date|structure|section|spacing|layout|font|readability/.test(
      text,
    )
  ) {
    return "structure";
  }
  if (/ats|column|graphic|image|keyword|parse|dense|table|scan/.test(text)) {
    return "ats";
  }
  if (
    /education|certification|contact|complete|link|missing|degree|coursework|email|phone/.test(
      text,
    )
  ) {
    return "completeness";
  }
  return null;
}

function ensureImprovementCategories(
  review: ResumeReviewResult,
): ResumeReviewImprovement[] {
  const assigned = new Map<ResumeReviewCategoryKey, ResumeReviewImprovement>();
  const unassigned: ResumeReviewImprovement[] = [];

  for (const item of review.improvements) {
    const key =
      item.categoryKey && isResumeReviewCategoryKey(item.categoryKey)
        ? item.categoryKey
        : inferImprovementCategory(item.title, item.detail);
    if (key && !assigned.has(key)) {
      assigned.set(key, { ...item, categoryKey: key });
    } else {
      unassigned.push(item);
    }
  }

  const sortedCategories = [...review.categories].sort(
    (a, b) => a.score - b.score,
  );
  for (const item of unassigned) {
    const openKey =
      sortedCategories.find((category) => !assigned.has(category.key))?.key ??
      RESUME_REVIEW_CATEGORY_KEYS.find((key) => !assigned.has(key));
    if (!openKey) break;
    assigned.set(openKey, { ...item, categoryKey: openKey });
  }

  return RESUME_REVIEW_CATEGORY_KEYS.flatMap((key) => {
    const item = assigned.get(key);
    return item ? [item] : [];
  }).sort((a, b) => a.rank - b.rank);
}

export function getResumeReviewImprovementForCategory(
  review: ResumeReviewResult,
  key: ResumeReviewCategoryKey,
) {
  return ensureImprovementCategories(review).find(
    (item) => item.categoryKey === key,
  ) ?? null;
}

export function groupResumeReviewImprovementsByCategory(
  review: ResumeReviewResult,
): Partial<Record<ResumeReviewCategoryKey, ResumeReviewImprovement>> {
  const grouped: Partial<
    Record<ResumeReviewCategoryKey, ResumeReviewImprovement>
  > = {};
  for (const item of ensureImprovementCategories(review)) {
    grouped[item.categoryKey] = item;
  }
  return grouped;
}
