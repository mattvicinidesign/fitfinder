/**
 * User-configurable Fit Score category weights.
 * Categories mirror the semantic matching engine (not invented labels).
 */

import type { SemanticCategoryKey } from "@/lib/types";
import {
  SEMANTIC_CATEGORY_LABELS,
  SEMANTIC_CATEGORY_WEIGHTS,
} from "@/lib/types";

export type MatchScoreWeightKey = SemanticCategoryKey;

export type MatchScoreWeights = Record<MatchScoreWeightKey, number>;

export type MatchScoreWeightPresetId =
  | "balanced"
  | "skillsFocused"
  | "experienceFocused"
  | "custom";

/** Named preset id, or a saved custom preset uuid. */
export type MatchScoreSelectionId =
  | Exclude<MatchScoreWeightPresetId, "custom">
  | string;

export interface MatchScoreCustomPreset {
  id: string;
  label: string;
  /** Short chip subtext (max 12 chars when created from the UI). */
  description: string;
  weights: MatchScoreWeights;
}

export const MATCH_SCORE_CUSTOM_DESCRIPTION_MAX = 12;

export interface MatchScoreWeightCategoryMeta {
  key: MatchScoreWeightKey;
  label: string;
  description: string;
}

/** Ordered category config — add new engine categories here once scored. */
export const MATCH_SCORE_WEIGHT_CATEGORIES: MatchScoreWeightCategoryMeta[] = [
  {
    key: "skillsTools",
    label: SEMANTIC_CATEGORY_LABELS.skillsTools,
    description:
      "Tools, technologies, and hard skills compared to the job posting.",
  },
  {
    key: "experience",
    label: SEMANTIC_CATEGORY_LABELS.experience,
    description: "Years of experience and seniority alignment with the role.",
  },
  {
    key: "responsibilities",
    label: SEMANTIC_CATEGORY_LABELS.responsibilities,
    description: "Day-to-day responsibilities and ownership overlap.",
  },
  {
    key: "domainBackground",
    label: SEMANTIC_CATEGORY_LABELS.domainBackground,
    description: "Industry, education, and domain background fit.",
  },
];

export const MATCH_SCORE_WEIGHT_KEYS: MatchScoreWeightKey[] =
  MATCH_SCORE_WEIGHT_CATEGORIES.map((c) => c.key);

export const DEFAULT_MATCH_SCORE_WEIGHTS: MatchScoreWeights = {
  ...SEMANTIC_CATEGORY_WEIGHTS,
};

/** Slider bounds — leave room so every category keeps a meaningful share. */
export const MATCH_SCORE_WEIGHT_MIN = 5;
export const MATCH_SCORE_WEIGHT_MAX = 70;
export const MATCH_SCORE_WEIGHT_STEP = 1;
export const MATCH_SCORE_WEIGHT_TOTAL = 100;

export interface MatchScoreWeightPreset {
  id: Exclude<MatchScoreWeightPresetId, "custom">;
  label: string;
  description: string;
  weights: MatchScoreWeights;
}

export const MATCH_SCORE_WEIGHT_PRESETS: MatchScoreWeightPreset[] = [
  {
    id: "balanced",
    label: "OnlyFit Default",
    description: "Balanced",
    weights: { ...DEFAULT_MATCH_SCORE_WEIGHTS },
  },
  {
    id: "skillsFocused",
    label: "Skills Focused",
    description: "Skills & Tools",
    weights: {
      skillsTools: 55,
      experience: 20,
      responsibilities: 15,
      domainBackground: 10,
    },
  },
  {
    id: "experienceFocused",
    label: "Seniority",
    description: "Years & Experience",
    weights: {
      skillsTools: 25,
      experience: 45,
      responsibilities: 20,
      domainBackground: 10,
    },
  },
];

export function sumMatchScoreWeights(weights: MatchScoreWeights): number {
  return MATCH_SCORE_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

export function areMatchScoreWeightsValid(weights: MatchScoreWeights): boolean {
  if (sumMatchScoreWeights(weights) !== MATCH_SCORE_WEIGHT_TOTAL) return false;
  return MATCH_SCORE_WEIGHT_KEYS.every(
    (key) =>
      Number.isFinite(weights[key]) &&
      weights[key] >= MATCH_SCORE_WEIGHT_MIN &&
      weights[key] <= MATCH_SCORE_WEIGHT_MAX,
  );
}

export function matchScoreWeightsEqual(
  a: MatchScoreWeights,
  b: MatchScoreWeights,
): boolean {
  return MATCH_SCORE_WEIGHT_KEYS.every((key) => a[key] === b[key]);
}

export function resolveMatchScoreWeightPresetId(
  weights: MatchScoreWeights,
): MatchScoreWeightPresetId {
  for (const preset of MATCH_SCORE_WEIGHT_PRESETS) {
    if (matchScoreWeightsEqual(weights, preset.weights)) return preset.id;
  }
  return "custom";
}

export function isNamedMatchScorePresetId(
  id: string,
): id is Exclude<MatchScoreWeightPresetId, "custom"> {
  return MATCH_SCORE_WEIGHT_PRESETS.some((preset) => preset.id === id);
}

export function nextCustomPresetLabel(
  existing: MatchScoreCustomPreset[],
): string {
  const used = new Set<number>();
  for (const preset of existing) {
    const match = /^Custom (\d+)$/i.exec(preset.label.trim());
    if (match) used.add(Number(match[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `Custom ${n}`;
}

export function createMatchScoreCustomPreset(
  weights: MatchScoreWeights,
  existing: MatchScoreCustomPreset[],
  label?: string,
  description?: string,
): MatchScoreCustomPreset {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const trimmed = label?.trim() ?? "";
  const trimmedDescription = (description?.trim() ?? "").slice(
    0,
    MATCH_SCORE_CUSTOM_DESCRIPTION_MAX,
  );
  return {
    id,
    label: trimmed || nextCustomPresetLabel(existing),
    description: trimmedDescription,
    weights: { ...weights },
  };
}

/** True when saving these weights would append a new Custom preset. */
export function wouldCreateMatchScoreCustomPreset(
  weights: MatchScoreWeights,
  customPresets: MatchScoreCustomPreset[],
): boolean {
  for (const named of MATCH_SCORE_WEIGHT_PRESETS) {
    if (matchScoreWeightsEqual(weights, named.weights)) return false;
  }
  return !customPresets.some((preset) =>
    matchScoreWeightsEqual(preset.weights, weights),
  );
}

export function normalizeMatchScoreCustomPresets(
  value: unknown,
): MatchScoreCustomPreset[] {
  if (!Array.isArray(value)) return [];
  const out: MatchScoreCustomPreset[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const description =
      typeof record.description === "string"
        ? record.description.trim().slice(0, MATCH_SCORE_CUSTOM_DESCRIPTION_MAX)
        : "";
    const weights = normalizeMatchScoreWeights(record.weights);
    if (!id || !label || !weights) continue;
    out.push({ id, label, description, weights });
  }
  return out;
}

export function matchScoreCustomPresetsEqual(
  a: MatchScoreCustomPreset[],
  b: MatchScoreCustomPreset[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((preset, index) => {
    const other = b[index];
    if (!other) return false;
    return (
      preset.id === other.id &&
      preset.label === other.label &&
      preset.description === other.description &&
      matchScoreWeightsEqual(preset.weights, other.weights)
    );
  });
}

/**
 * If active weights are custom but no Custom presets exist yet (legacy),
 * seed Custom 1 so the carousel can show it.
 */
export function ensureLegacyMatchScoreCustomPresets(
  weights: MatchScoreWeights,
  customPresets: MatchScoreCustomPreset[],
): MatchScoreCustomPreset[] {
  if (customPresets.length > 0) return customPresets;
  if (resolveMatchScoreWeightPresetId(weights) !== "custom") {
    return customPresets;
  }
  return [createMatchScoreCustomPreset(weights, [])];
}

/**
 * Resolve UI selection from persisted weights + custom list.
 */
export function resolveMatchScoreSelectionId(
  weights: MatchScoreWeights,
  customPresets: MatchScoreCustomPreset[],
): MatchScoreSelectionId {
  const customHit = customPresets.find((preset) =>
    matchScoreWeightsEqual(preset.weights, weights),
  );
  if (customHit) return customHit.id;
  const named = resolveMatchScoreWeightPresetId(weights);
  return named === "custom" ? "balanced" : named;
}

export function removeMatchScoreCustomPreset(
  customPresets: MatchScoreCustomPreset[],
  id: string,
): MatchScoreCustomPreset[] {
  return customPresets.filter((preset) => preset.id !== id);
}

/**
 * Persist active weights and create numbered Custom presets.
 * - Weights match a named preset → keep that named selection (no new Custom)
 * - Weights match an existing Custom → select that Custom (no duplicate)
 * - Otherwise → always append Custom N (never overwrite an existing Custom)
 */
export function commitMatchPreferenceSave(input: {
  weights: MatchScoreWeights;
  customPresets: MatchScoreCustomPreset[];
  /** Required when creating a new Custom — shown in the name modal. */
  customLabel?: string;
  customDescription?: string;
}): {
  weights: MatchScoreWeights;
  customPresets: MatchScoreCustomPreset[];
  selectedPresetId: MatchScoreSelectionId;
  createdCustom: MatchScoreCustomPreset | null;
} {
  const weights = { ...input.weights };
  const customs = [...input.customPresets];

  for (const named of MATCH_SCORE_WEIGHT_PRESETS) {
    if (matchScoreWeightsEqual(weights, named.weights)) {
      return {
        weights,
        customPresets: customs,
        selectedPresetId: named.id,
        createdCustom: null,
      };
    }
  }

  const existingCustom = customs.find((preset) =>
    matchScoreWeightsEqual(preset.weights, weights),
  );
  if (existingCustom) {
    return {
      weights,
      customPresets: customs,
      selectedPresetId: existingCustom.id,
      createdCustom: null,
    };
  }

  const created = createMatchScoreCustomPreset(
    weights,
    customs,
    input.customLabel,
    input.customDescription,
  );
  return {
    weights,
    customPresets: [...customs, created],
    selectedPresetId: created.id,
    createdCustom: created,
  };
}

function clampWeight(value: number): number {
  return Math.min(
    MATCH_SCORE_WEIGHT_MAX,
    Math.max(MATCH_SCORE_WEIGHT_MIN, Math.round(value)),
  );
}

/** Distribute `remaining` points across `keys` from a base map; fix rounding drift. */
function distributeRemaining(
  base: MatchScoreWeights,
  keys: MatchScoreWeightKey[],
  remaining: number,
): MatchScoreWeights {
  const next = { ...base };
  if (keys.length === 0) return next;

  const currentSum = keys.reduce((sum, key) => sum + next[key], 0);
  if (currentSum <= 0) {
    const even = Math.floor(remaining / keys.length);
    let leftover = remaining - even * keys.length;
    for (const key of keys) {
      next[key] = even + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover -= 1;
    }
    return next;
  }

  let allocated = 0;
  const rawShares = keys.map((key) => {
    const share = (next[key] / currentSum) * remaining;
    return { key, share };
  });

  for (const { key, share } of rawShares) {
    next[key] = Math.max(MATCH_SCORE_WEIGHT_MIN, Math.round(share));
    allocated += next[key];
  }

  let drift = remaining - allocated;
  let guard = 0;
  while (drift !== 0 && guard < 200) {
    guard += 1;
    const ordered = [...keys].sort((a, b) =>
      drift > 0 ? next[b] - next[a] : next[a] - next[b],
    );
    let moved = false;
    for (const key of ordered) {
      if (drift === 0) break;
      if (drift > 0 && next[key] < MATCH_SCORE_WEIGHT_MAX) {
        next[key] += 1;
        drift -= 1;
        moved = true;
      } else if (drift < 0 && next[key] > MATCH_SCORE_WEIGHT_MIN) {
        next[key] -= 1;
        drift += 1;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return next;
}

/**
 * Update one category weight and rebalance the rest so the total stays 100%.
 */
export function rebalanceMatchScoreWeights(
  current: MatchScoreWeights,
  key: MatchScoreWeightKey,
  nextValue: number,
): MatchScoreWeights {
  const clamped = clampWeight(nextValue);
  const others = MATCH_SCORE_WEIGHT_KEYS.filter((k) => k !== key);
  const remaining = MATCH_SCORE_WEIGHT_TOTAL - clamped;
  const minOthers = others.length * MATCH_SCORE_WEIGHT_MIN;

  if (remaining < minOthers) {
    const adjusted = MATCH_SCORE_WEIGHT_TOTAL - minOthers;
    const next: MatchScoreWeights = { ...current, [key]: adjusted };
    for (const other of others) next[other] = MATCH_SCORE_WEIGHT_MIN;
    return next;
  }

  const seeded: MatchScoreWeights = { ...current, [key]: clamped };
  return distributeRemaining(seeded, others, remaining);
}

export function normalizeMatchScoreWeights(
  value: unknown,
): MatchScoreWeights | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const next = { ...DEFAULT_MATCH_SCORE_WEIGHTS };

  for (const key of MATCH_SCORE_WEIGHT_KEYS) {
    const raw = record[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    next[key] = Math.round(raw);
  }

  if (!areMatchScoreWeightsValid(next)) {
    // Attempt a soft repair from near-valid payloads (e.g. rounding drift).
    let repaired = { ...next };
    for (const key of MATCH_SCORE_WEIGHT_KEYS) {
      repaired = rebalanceMatchScoreWeights(repaired, key, repaired[key]);
    }
    if (!areMatchScoreWeightsValid(repaired)) return null;
    return repaired;
  }

  return next;
}

export function matchScoreWeightsFromProfile(
  weights: MatchScoreWeights | null | undefined,
): MatchScoreWeights {
  return weights ? { ...weights } : { ...DEFAULT_MATCH_SCORE_WEIGHTS };
}

/**
 * Future preference groups live beside score weights on this registry.
 * Add new groups here without rewriting the Profile tab shell.
 */
export type MatchPreferenceGroupId = "scoreWeights";

export interface MatchPreferenceGroupMeta {
  id: MatchPreferenceGroupId;
  title: string;
  description: string;
}

export const MATCH_PREFERENCE_GROUPS: MatchPreferenceGroupMeta[] = [
  {
    id: "scoreWeights",
    title: "Fit Score Weights",
    description:
      "Control how much each resume category influences your Fit Score.",
  },
];
