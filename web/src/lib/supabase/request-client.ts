import {
  createClient as createSupabaseJsClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export type RequestAuth = {
  supabase: SupabaseClient;
  user: User | null;
};

/**
 * Supabase client + user for Route Handlers.
 * Prefers `Authorization: Bearer` (native Capacitor), else cookie session (web).
 */
export async function resolveRequestAuth(request: Request): Promise<RequestAuth> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Server missing Supabase configuration");
    }
    const supabase = createSupabaseJsClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${bearer}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser(bearer);
    return { supabase, user };
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
