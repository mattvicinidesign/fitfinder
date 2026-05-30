"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProfileRow {
  country: string | null;
  timezone: string | null;
  desired_compensation: number | null;
  work_authorization: string | null;
}

export function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<ProfileRow>({
    country: "",
    timezone: "",
    desired_compensation: null,
    work_authorization: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      setIsGuest(user.is_anonymous ?? false);
      const { data } = await supabase
        .from("profiles")
        .select("country, timezone, desired_compensation, work_authorization")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          country: data.country ?? "",
          timezone: data.timezone ?? "",
          desired_compensation: data.desired_compensation,
          work_authorization: data.work_authorization ?? "",
        });
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      country: profile.country || null,
      timezone: profile.timezone || null,
      desired_compensation: profile.desired_compensation,
      work_authorization: profile.work_authorization || null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated.");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <IosLargeTitle title="Profile" subtitle="Account and job-search preferences." />

      <form onSubmit={save} className="py-4 space-y-6">
        <IosGroupedSection title="Account">
          <IosGroupedRow>
            <p className="text-[17px]">{isGuest ? "Guest session" : email ?? "—"}</p>
          </IosGroupedRow>
        </IosGroupedSection>

        <IosGroupedSection title="Preferences">
          <IosGroupedRow className="space-y-4">
            <Field
              label="Country"
              value={profile.country ?? ""}
              onChange={(v) => setProfile((p) => ({ ...p, country: v }))}
            />
            <Field
              label="Timezone"
              value={profile.timezone ?? ""}
              placeholder="America/New_York"
              onChange={(v) => setProfile((p) => ({ ...p, timezone: v }))}
            />
            <Field
              label="Desired compensation"
              type="number"
              value={profile.desired_compensation?.toString() ?? ""}
              onChange={(v) =>
                setProfile((p) => ({
                  ...p,
                  desired_compensation: v ? Number(v) : null,
                }))
              }
            />
            <Field
              label="Work authorization"
              value={profile.work_authorization ?? ""}
              onChange={(v) => setProfile((p) => ({ ...p, work_authorization: v }))}
            />
          </IosGroupedRow>
        </IosGroupedSection>

        <div className="px-4 space-y-3">
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl text-destructive"
            onClick={signOut}
          >
            {isGuest ? "Sign out of guest session" : "Sign out"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5 first:pt-0 not-first:border-t not-first:border-border/60 not-first:pt-4">
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-[17px] bg-transparent border-0 shadow-none px-0 focus-visible:ring-0"
      />
    </div>
  );
}
