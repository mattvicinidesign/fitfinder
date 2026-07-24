// POST /functions/v1/delete-account
// Deletes the caller's resume files and auth account (registered users only).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { deleteUserAccount } from "../_shared/deleteUserAccount.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";

function createAdminClient() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const userId = await requireUser(supabase);
    const admin = createAdminClient();
    const result = await deleteUserAccount(admin, userId);
    if (result.error) {
      return error("Could not delete account. Please try again.", 500);
    }
    return json({ ok: true });
  } catch (response) {
    if (response instanceof Response) return response;
    return error("Could not delete account. Please try again.", 500);
  }
});
