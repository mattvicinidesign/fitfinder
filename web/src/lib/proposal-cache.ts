"use client";

import type { ProposalGeneration } from "@/lib/types";

/**
 * Session-scoped cache for generated proposals, keyed by report id. Keeps a
 * generated proposal available when navigating away and back to a report
 * within the same session. Additive — never touches the analysis cache.
 */
const STORAGE_PREFIX = "fitfinder:proposal:";

function storageKey(reportId: string): string {
  return `${STORAGE_PREFIX}${reportId}`;
}

export function saveProposal(
  reportId: string | null | undefined,
  proposal: ProposalGeneration,
): void {
  if (!reportId || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(reportId), JSON.stringify(proposal));
  } catch {
    /* storage full or unavailable — in-memory state still works */
  }
}

export function loadProposal(
  reportId: string | null | undefined,
): ProposalGeneration | null {
  if (!reportId || typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(reportId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProposalGeneration;
  } catch {
    return null;
  }
}

export function clearProposal(reportId: string | null | undefined): void {
  if (!reportId || typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(storageKey(reportId));
}
