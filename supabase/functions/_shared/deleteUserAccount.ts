import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Remove resume files and the auth user (service role required). */
export async function deleteUserAccount(
  admin: SupabaseClient,
  userId: string,
): Promise<{ error?: string }> {
  const { data: files, error: listError } = await admin.storage
    .from("resumes")
    .list(userId, { limit: 1000 });

  if (listError) {
    return { error: `Failed to remove documents: ${listError.message}` };
  }

  if (files?.length) {
    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await admin.storage
      .from("resumes")
      .remove(paths);
    if (removeError) {
      return { error: `Failed to remove documents: ${removeError.message}` };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  return {};
}
