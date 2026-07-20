import type { AtsKeywordChange } from "@/lib/types";
import { occurrenceIndexForChange } from "@/lib/ats-keyword-optimization-core";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  if (change.originalBulletText && change.optimizedBulletText) {
    return {
      beforeSnippet: change.originalBulletText,
      afterSnippet: change.optimizedBulletText,
    };
  }

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

export function buildAppliedKeywordChangeSnippets(
  originalText: string,
  optimizedText: string,
  changes: AtsKeywordChange[],
): AtsKeywordChangeSnippet[] {
  const originalLines = originalText.split("\n");
  const optimizedLines = optimizedText.split("\n");

  return changes.map((change, index) => {
    const occurrence = occurrenceIndexForChange(changes, index);
    const beforeSnippet =
      typeof change.lineIndex === "number" &&
      originalLines[change.lineIndex]?.trim()
        ? originalLines[change.lineIndex]!.trim()
        : findLineSnippet(originalText, change.before, occurrence);

    const afterSnippet =
      typeof change.lineIndex === "number" &&
      optimizedLines[change.lineIndex]?.trim()
        ? optimizedLines[change.lineIndex]!.trim()
        : findLineSnippet(optimizedText, change.after, occurrence) ||
          beforeSnippet.replace(
            new RegExp(escapeRegExp(change.before), "i"),
            change.after,
          );

    return { beforeSnippet, afterSnippet };
  });
}
