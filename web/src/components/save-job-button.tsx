"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SaveJobButton({ analysisId }: { analysisId: string | null }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!analysisId) return null;

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to save jobs.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("saved_jobs").insert({
      user_id: user.id,
      analysis_id: analysisId,
      status: "saved",
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") {
        setSaved(true);
        toast.message("Already in saved jobs.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setSaved(true);
    toast.success("Saved to your list.");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy || saved}
      onClick={save}
    >
      {saved ? "Saved" : busy ? "Saving…" : "Save job"}
    </Button>
  );
}
