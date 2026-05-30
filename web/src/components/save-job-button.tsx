"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SaveJobButton({ analysisId }: { analysisId: string | null }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!analysisId) {
      setSaved(false);
      setChecked(false);
      return;
    }

    let cancelled = false;
    setChecked(false);

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setChecked(true);
        return;
      }

      const { data, error } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("analysis_id", analysisId)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) setSaved(true);
        setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const toggle = useCallback(async () => {
    if (!analysisId || busy) return;

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

    if (saved) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user.id)
        .eq("analysis_id", analysisId);

      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setSaved(false);
      toast.message("Removed from saved jobs.");
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
  }, [analysisId, busy, saved]);

  if (!analysisId) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 rounded-full"
      disabled={busy || !checked}
      aria-label={saved ? "Remove bookmark" : "Bookmark job"}
      aria-pressed={saved}
      onClick={() => void toggle()}
    >
      <Bookmark
        className={cn(
          "size-5 transition-colors",
          saved
            ? "fill-primary text-primary"
            : "text-muted-foreground",
          busy && "opacity-50",
        )}
      />
    </Button>
  );
}
