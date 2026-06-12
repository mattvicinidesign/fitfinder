"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useProfileSheetClose } from "@/components/app-shell/profile-sheet-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipMultiSelect, SelectableChip } from "@/components/ui/chip-multi-select";
import {
  COMPANY_TYPE_OPTIONS,
  ENGAGEMENT_TYPE_OPTIONS,
  HOURLY_RATE_PRESETS,
  REGION_OPTIONS,
  RED_FLAG_OPTIONS,
} from "@/lib/onboarding-options";
import {
  emptyUserProfile,
  fetchUserProfile,
  profilesEqual,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import {
  fetchUserResumeDocuments,
  type ResumeDocument,
} from "@/lib/resume-documents";
import { deleteAccount } from "@/lib/delete-account";
import { navigateApp } from "@/lib/navigate-app";
import { cn } from "@/lib/utils";
import {
  SkeletonAnalysisList,
  SkeletonProfileScreen,
} from "@/components/ui/skeletons";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { safeBottomOverlay, safeTopCompact } from "@/lib/safe-area";

type ProfileTab = "general" | "skills" | "documents" | "settings";

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "general", label: "General Info" },
  { id: "skills", label: "Skills" },
  { id: "documents", label: "Documents" },
  { id: "settings", label: "Settings" },
];

export function ProfileScreen() {
  const router = useRouter();
  const closeProfile = useProfileSheetClose();
  const [profileLoading, setProfileLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile());
  const [savedProfile, setSavedProfile] = useState<UserProfile>(emptyUserProfile());
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDirty = !profilesEqual(profile, savedProfile);
  const showFloatingActions =
    (activeTab === "general" || activeTab === "skills") && isDirty;

  async function loadDocuments() {
    setDocumentsLoading(true);
    const rows = await fetchUserResumeDocuments();
    setDocuments(rows);
    setDocumentsLoading(false);
  }

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfileLoading(false);
        return;
      }
      setEmail(user.email ?? null);
      setIsGuest(user.is_anonymous ?? false);
      const existing = await fetchUserProfile();
      if (existing) {
        setProfile(existing);
        setSavedProfile(existing);
      }
      setProfileLoading(false);
      void loadDocuments();
    })();
  }, []);

  useEffect(() => {
    if (activeTab === "documents") void loadDocuments();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  function patch(next: Partial<UserProfile>) {
    setProfile((p) => ({ ...p, ...next }));
  }

  async function save() {
    setBusy(true);
    const { error } = await saveUserProfile(profile);
    setBusy(false);
    if (error) toast.error(error);
    else {
      setSavedProfile(profile);
      toast.success("Profile updated.");
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);

    if (error) {
      toast.error(error);
      return;
    }

    navigateApp("/home", router, "replace");
  }

  return (
    <div className={screenShellClass}>
      <StickyScreenHeader className={`px-4 pb-3 ${safeTopCompact}`}>
        <div className="relative flex items-start justify-between gap-3">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">
            Profile
          </h1>
          <button
            type="button"
            onClick={() => closeProfile?.()}
            aria-label="Close profile"
            className="-mr-1 mt-1 inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <X className="size-5 shrink-0" aria-hidden />
          </button>
        </div>
      </StickyScreenHeader>

      <StickyScreenBody ref={scrollRef} className="py-4">
        <div key={activeTab} className="space-y-7">
        <nav
          className="mx-4 flex border-b border-border/60 overflow-x-auto"
          aria-label="Profile sections"
        >
          {PROFILE_TABS.map((tab) => {
            const label =
              tab.id === "documents"
                ? `Documents (${documents.length})`
                : tab.label;

            return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative min-w-0 flex-1 shrink-0 px-0.5 pb-2.5 pt-1 text-[12px] font-medium transition-colors sm:text-[13px]",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {label}
              {activeTab === tab.id ? (
                <span
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </button>
            );
          })}
        </nav>

        {profileLoading ? (
          <SkeletonProfileScreen />
        ) : activeTab === "general" ? (
          <div className="space-y-7">
            <FakeAdvertisement />

            <Section title="About you">
              <div className="space-y-4">
                <LabeledInput
                  label="Name"
                  placeholder="Your name"
                  value={profile.fullName ?? ""}
                  onChange={(v) => patch({ fullName: v })}
                />
                <LabeledInput
                  label="Title"
                  placeholder="e.g. Senior Product Designer"
                  value={profile.professionalTitle ?? ""}
                  onChange={(v) => patch({ professionalTitle: v })}
                />
              </div>
            </Section>

            <Section title="Location">
              <div className="space-y-4">
                <LabeledInput
                  label="Country"
                  value={profile.country ?? ""}
                  onChange={(v) => patch({ country: v })}
                />
                <LabeledInput
                  label="Timezone"
                  placeholder="America/New_York"
                  value={profile.timezone ?? ""}
                  onChange={(v) => patch({ timezone: v })}
                />
              </div>
            </Section>
          </div>
        ) : activeTab === "skills" ? (
          <div className="space-y-7">
            <Section
              title="Minimum hourly rate"
              subtitle="Skills, tools, industries, and roles come from your resume — this is about what you want."
            >
              <div className="flex items-center gap-2">
                <span className="text-[20px] text-muted-foreground">$</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="75"
                  value={profile.minimumHourlyRate?.toString() ?? ""}
                  onChange={(e) =>
                    patch({
                      minimumHourlyRate: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-11 w-28 text-[17px]"
                />
                <span className="text-[15px] text-muted-foreground">/hr</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {HOURLY_RATE_PRESETS.map((rate) => (
                  <SelectableChip
                    key={rate}
                    label={rate >= 150 ? `$${rate}+` : `$${rate}`}
                    selected={profile.minimumHourlyRate === rate}
                    onToggle={() => patch({ minimumHourlyRate: rate })}
                  />
                ))}
              </div>
            </Section>

            <Section title="Preferred engagement types">
              <ChipMultiSelect
                options={ENGAGEMENT_TYPE_OPTIONS}
                value={profile.preferredEngagementTypes}
                onChange={(v) => patch({ preferredEngagementTypes: v })}
              />
            </Section>

            <Section title="Preferred regions">
              <ChipMultiSelect
                options={REGION_OPTIONS}
                value={profile.preferredRegions}
                onChange={(v) => patch({ preferredRegions: v })}
              />
            </Section>

            <Section title="Preferred company types">
              <ChipMultiSelect
                options={COMPANY_TYPE_OPTIONS}
                value={profile.preferredCompanyTypes}
                onChange={(v) => patch({ preferredCompanyTypes: v })}
              />
            </Section>

            <Section
              title="Penalize these opportunity types"
              subtitle="Matching roles are flagged as low alignment."
            >
              <ChipMultiSelect
                options={RED_FLAG_OPTIONS}
                value={profile.redFlags}
                onChange={(v) => patch({ redFlags: v })}
              />
            </Section>
          </div>
        ) : activeTab === "documents" ? (
          <div className="space-y-7">
            <Section
              title="Resume"
              subtitle="Upload a resume to use across your fit analyses."
            >
              <ResumeFilePicker
                className="min-h-[140px]"
                onParsed={() => void loadDocuments()}
              />
            </Section>

            <Section title="Your documents">
              {documentsLoading ? (
                <SkeletonAnalysisList count={2} className="mx-0" />
              ) : documents.length === 0 ? (
                <p className="text-[15px] text-muted-foreground leading-snug">
                  No documents yet. Upload a resume above to get started.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium truncate">
                          {doc.fileName}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        ) : (
          <div className="space-y-7">
            <Section title="Account">
              <p className="text-[15px] text-foreground">
                {isGuest ? "Guest session" : email ?? "Signed in"}
              </p>
              {isGuest ? (
                <p className="text-[13px] text-muted-foreground leading-snug">
                  Create a profile with your email to save analyses across
                  devices.
                </p>
              ) : null}
            </Section>

            <Section title="Onboarding">
              <Link
                href="/onboarding"
                className="inline-flex text-[15px] font-medium text-primary hover:underline"
              >
                Re-run onboarding
              </Link>
            </Section>

            <Section title="Delete account">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl px-0 text-destructive hover:bg-transparent hover:text-destructive"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete account
              </Button>
            </Section>
          </div>
        )}
        </div>
      </StickyScreenBody>

      {showFloatingActions ? (
        <StickyBottomCta>
          <Button
            type="button"
            className="w-full h-12 rounded-xl"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </StickyBottomCta>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center px-4 sm:items-center ${safeBottomOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => !deleting && setDeleteConfirmOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <h2
              id="delete-account-title"
              className="text-[17px] font-semibold leading-snug"
            >
              Delete account?
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground leading-snug">
              {isGuest
                ? "This permanently removes your guest session, profile, analyses, and documents. This cannot be undone."
                : "This permanently removes your account, profile, analyses, and documents. This cannot be undone."}
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="h-11 flex-1 rounded-xl"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 flex-1 rounded-xl"
                disabled={deleting}
                onClick={() => void confirmDeleteAccount()}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FakeAdvertisement() {
  return (
    <aside
      className="mx-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
      aria-label="Advertisement"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Sponsored
        </span>
        <span className="text-[10px] text-muted-foreground">Ad</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[15px] font-semibold leading-snug">
          Land your next role faster with FitFinder Pro
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground leading-snug">
          Unlimited analyses, saved comparisons, and priority scoring — $9/mo.
        </p>
        <p className="mt-2 text-[13px] font-medium text-primary">
          Learn more →
        </p>
      </div>
    </aside>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle ? (
          <p className="text-[13px] text-muted-foreground leading-snug">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] text-muted-foreground">{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-[17px]"
      />
    </div>
  );
}
