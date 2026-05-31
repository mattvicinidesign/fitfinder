import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Account deletion is not configured on this server." },
      { status: 503 },
    );
  }

  const { data: files, error: listError } = await admin.storage
    .from("resumes")
    .list(user.id, { limit: 1000 });

  if (listError) {
    return NextResponse.json(
      { error: `Failed to remove documents: ${listError.message}` },
      { status: 500 },
    );
  }

  if (files?.length) {
    const paths = files.map((file) => `${user.id}/${file.name}`);
    const { error: removeError } = await admin.storage
      .from("resumes")
      .remove(paths);
    if (removeError) {
      return NextResponse.json(
        { error: `Failed to remove documents: ${removeError.message}` },
        { status: 500 },
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
