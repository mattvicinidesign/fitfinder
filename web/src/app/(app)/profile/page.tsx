"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface ProfileRow {
  country: string | null;
  timezone: string | null;
  desired_compensation: number | null;
  work_authorization: string | null;
}

export default function ProfilePage() {
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

  return (
    <div className="mx-auto max-w-lg px-4 py-6 md:py-10">
      <PageHeader
        title="Profile"
        description="Account and job-search preferences."
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {isGuest ? "Guest session" : email ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profile.country ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, country: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tz">Timezone</Label>
              <Input
                id="tz"
                placeholder="America/New_York"
                value={profile.timezone ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, timezone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp">Desired compensation (annual)</Label>
              <Input
                id="comp"
                type="number"
                value={profile.desired_compensation ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    desired_compensation: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth">Work authorization</Label>
              <Input
                id="auth"
                value={profile.work_authorization ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    work_authorization: e.target.value,
                  }))
                }
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
