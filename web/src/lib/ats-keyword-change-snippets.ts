import type { AtsKeywordChange } from "@/lib/types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function occurrenceIndexForChange(
  changes: AtsKeywordChange[],
  index: number,
): number {
  const target = changes[index]?.before.toLowerCase();
  if (!target) return 0;

  let count = 0;
  for (let i = 0; i < index; i += 1) {
    if (changes[i]?.before.toLowerCase() === target) count += 1;
  }
  return count;
}

function findLineSnippet(text: string, phrase: string, occurrence: number): string {
  const pattern = new RegExp(escapeRegExp(phrase), "i");
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matchingLines = lines.filter((line) => pattern.test(line));

  if (matchingLines.length > 0) {
    return matchingLines[occurrence] ?? matchingLines[0] ?? "";
  }

  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const matchingSentences = sentences.filter((sentence) => pattern.test(sentence));

  if (matchingSentences.length > 0) {
    return matchingSentences[occurrence] ?? matchingSentences[0] ?? "";
  }

  return `…${phrase}…`;
}

export type AtsKeywordChangeSnippet = {
  beforeSnippet: string;
  afterSnippet: string;
};

export function getAtsKeywordChangeSnippet(
  originalText: string,
  change: AtsKeywordChange,
  occurrence: number,
): AtsKeywordChangeSnippet {
  const beforeSnippet = findLineSnippet(originalText, change.before, occurrence);
  const afterSnippet = beforeSnippet.replace(
    new RegExp(escapeRegExp(change.before), "i"),
    change.after,
  );

  return { beforeSnippet, afterSnippet };
}

export function buildAtsKeywordChangeSnippets(
  originalText: string,
  changes: AtsKeywordChange[],
): AtsKeywordChangeSnippet[] {
  return changes.map((change, index) =>
    getAtsKeywordChangeSnippet(
      originalText,
      change,
      occurrenceIndexForChange(changes, index),
    ),
  );
}

export function applyKeywordChangeAtOccurrence(
  text: string,
  change: AtsKeywordChange,
  occurrence: number,
): string {
  const pattern = new RegExp(escapeRegExp(change.before), "gi");
  let matchIndex = 0;
  return text.replace(pattern, (match) => {
    const current = matchIndex;
    matchIndex += 1;
    return current === occurrence ? change.after : match;
  });
}
