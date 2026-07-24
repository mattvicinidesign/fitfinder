// Resolve guest vs registered from the authenticated JWT + DB only.
// Never trust client-supplied scoringMode / account_type / feature flags.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { MatchScoreWeights } from "./match_score_weights.ts";
import type { ScoringMode } from "./scoring_constants.ts";
import { corsHeaders } from "./cors.ts";

export type AccountAccess = {
  userId: string;
  isAnonymous: boolean;
  accountType: "guest" | "registered";
  scoringMode: ScoringMode;
};

/**
 * Auth + account_type from DB (synced from auth.users.is_anonymous).
 * Prefer JWT is_anonymous when present; fall back to users.account_type.
 */
export async function requireAccountAccess(
  client: SupabaseClient,
): Promise<AccountAccess> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = data.user.id;
  const jwtAnonymous = data.user.is_anonymous === true;

  const { data: userRow } = await client
    .from("users")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  const dbGuest = userRow?.account_type === "guest";
  // JWT anonymous is authoritative when true; otherwise trust DB guest flag.
  const isGuest = jwtAnonymous || dbGuest;
  const accountType = isGuest ? "guest" : "registered";

  return {
    userId,
    isAnonymous: jwtAnonymous,
    accountType,
    scoringMode: accountType,
  };
}

/** Category weights from the client are only trusted for registered users. */
export function resolveTrustedCategoryWeights(
  scoringMode: ScoringMode,
  requested: unknown,
  stored: unknown,
): Partial<MatchScoreWeights> | null {
  const fromStore =
    stored && typeof stored === "object"
      ? (stored as Partial<MatchScoreWeights>)
      : null;
  if (scoringMode === "guest") {
    return fromStore;
  }
  if (requested && typeof requested === "object") {
    return requested as Partial<MatchScoreWeights>;
  }
  return fromStore;
}
