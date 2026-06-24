"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELDS_STACK_CLASS,
} from "@/components/form-field-styles";
import { ChipMultiSelect } from "@/components/ui/chip-multi-select";
import { EmployerRatingSlider } from "@/components/employer-rating-slider";
import { MinimumHourlyRateSlider } from "@/components/minimum-hourly-rate-slider";
import {
  COMPANY_TYPE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/onboarding-options";
import {
  emptyUserProfile,
  fetchUserProfile,
  generalInfoDirty,
  isGeneralInfoValid,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";
import {
  pickLocalProfilePrefs,
  saveLocalProfilePrefs,
} from "@/lib/local-profile-prefs";
import { AppearanceModeSetting } from "@/components/appearance-mode-setting";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import { deleteAccount } from "@/lib/delete-account";
import { navigateApp } from "@/lib/navigate-app";
import { TIMEZONE_OPTIONS } from "@/lib/timezone-options";
import { cn } from "@/lib/utils";
import {
  SkeletonProfileScreen,
} from "@/components/ui/skeletons";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
} from "@/components/ui/sticky-bottom-cta";
import { safeBottomOverlay } from "@/lib/safe-area";

type ProfileTab = "general" | "preferences" | "settings";

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "general", label: "General Info" },
  { id: "preferences", label: "Preferences" },
  { id: "settings", label: "Settings" },
];

export function ProfileScreen() {
  const router = useRouter();
  const [profileLoading, setProfileLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile());
  const [savedProfile, setSavedProfile] = useState<UserProfile>(emptyUserProfile());
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generalInfoChanged = generalInfoDirty(profile, savedProfile);
  const canSaveGeneralInfo = isGeneralInfoValid(profile);
  const showFloatingActions = activeTab === "general" && generalInfoChanged;

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
        saveLocalProfilePrefs(pickLocalProfilePrefs(existing));
      }
      setProfileLoading(false);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  function patch(next: Partial<UserProfile>) {
    setProfile((p) => {
      const updated = { ...p, ...next };
      const prefKeys: (keyof UserProfile)[] = [
        "minimumHourlyRate",
        "preferredMinimumEmployerRating",
        "preferredCompanyTypes",
        "preferredRegions",
        "preferredProjectTypes",
        "timezone",
      ];
      if (Object.keys(next).some((key) => prefKeys.includes(key as keyof UserProfile))) {
        saveLocalProfilePrefs(pickLocalProfilePrefs(updated));
        void saveUserProfile(updated).then(({ error }) => {
          if (!error) setSavedProfile(updated);
        });
      }
      return updated;
    });
  }

  async function save() {
    if (!isGeneralInfoValid(profile)) return;
    const normalized: UserProfile = {
      ...profile,
      fullName: profile.fullName?.trim() || null,
      country: profile.country?.trim() || null,
    };
    setBusy(true);
    const { error } = await saveUserProfile(normalized);
    setBusy(false);
    if (error) toast.error(error);
    else {
      setProfile(normalized);
      setSavedProfile(normalized);
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
      <IosLargeTitle title="Profile" />

      <StickyScreenBody ref={scrollRef} className="py-4">
        <div key={activeTab} className="flex flex-col gap-4">
        <nav
          className="mx-4 flex border-b border-border/60 overflow-x-auto"
          aria-label="Profile sections"
        >
          {PROFILE_TABS.map((tab) => (
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
              {tab.label}
              {activeTab === tab.id ? (
                <span
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </button>
          ))}
        </nav>

        {profileLoading ? (
          <SkeletonProfileScreen />
        ) : activeTab === "general" ? (
          <div className={FORM_FIELDS_STACK_CLASS}>
            <LabeledInput
              label="Name"
              placeholder="Your name"
              value={profile.fullName ?? ""}
              onChange={(v) => patch({ fullName: v })}
            />
            <LabeledInput
              label="Email"
              value={isGuest ? "" : email ?? ""}
              placeholder={isGuest ? "Guest session" : "you@example.com"}
              readOnly
            />
            <LabeledInput
              label="Location"
              placeholder="City, country"
              value={profile.country ?? ""}
              onChange={(v) => patch({ country: v })}
            />
            <div className={FORM_FIELD_GROUP_CLASS}>
              <label className={FORM_FIELD_LABEL_CLASS}>Resume</label>
              <ResumeFilePicker className="min-h-[140px]" onParsed={() => {}} />
            </div>
          </div>
        ) : activeTab === "preferences" ? (
          <div className={FORM_FIELDS_STACK_CLASS}>
            <Section title="Min hourly rate">
              <MinimumHourlyRateSlider
                value={profile.minimumHourlyRate}
                onChange={(minimumHourlyRate) => patch({ minimumHourlyRate })}
              />
            </Section>

            <Section title="Employer Type">
              <ChipMultiSelect
                options={COMPANY_TYPE_OPTIONS}
                value={profile.preferredCompanyTypes}
                onChange={(v) => patch({ preferredCompanyTypes: v })}
              />
            </Section>

            <Section title="Minimum client rating">
              <EmployerRatingSlider
                value={profile.preferredMinimumEmployerRating}
                onChange={(preferredMinimumEmployerRating) =>
                  patch({ preferredMinimumEmployerRating })
                }
              />
            </Section>

            <Section title="Project type">
              <ChipMultiSelect
                options={PROJECT_TYPE_OPTIONS}
                value={profile.preferredProjectTypes}
                onChange={(v) => patch({ preferredProjectTypes: v })}
              />
            </Section>

            <Section title="Region">
              <ChipMultiSelect
                options={REGION_OPTIONS}
                value={profile.preferredRegions}
                onChange={(v) => patch({ preferredRegions: v })}
              />
            </Section>
          </div>
        ) : (
          <div className={FORM_FIELDS_STACK_CLASS}>
            <Section title="Light / dark mode">
              <AppearanceModeSetting />
            </Section>

            <Section title="Timezone">
              <select
                value={profile.timezone ?? ""}
                onChange={(e) =>
                  patch({ timezone: e.target.value.trim() || null })
                }
                className={cn(
                  "h-11 w-full rounded-md border border-input bg-background px-3 text-[17px] text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Timezone"
              >
                <option value="">Select timezone</option>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Section>

            <section
              className={cn(
                FORM_FIELD_GROUP_CLASS,
                "rounded-xl border border-destructive/25 bg-destructive/5 p-4",
              )}
            >
              <h2 className={FORM_FIELD_LABEL_CLASS}>Danger zone</h2>
              <p className="text-[15px] leading-snug text-muted-foreground">
                Permanently delete your account, profile, analyses, and documents.
                This cannot be undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-4 h-11 w-full rounded-xl"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete account
              </Button>
            </section>
          </div>
        )}
        </div>
      </StickyScreenBody>

      {showFloatingActions ? (
        <StickyBottomCta>
          <Button
            type="button"
            className="w-full h-12 rounded-xl"
            disabled={busy || !canSaveGeneralInfo}
            onClick={save}
          >
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </StickyBottomCta>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center px-4 sm:items-center ${safeBottomOverlay}`}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={FORM_FIELD_GROUP_CLASS}>
      <h2 className={FORM_FIELD_LABEL_CLASS}>{title}</h2>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className={FORM_FIELD_GROUP_CLASS}>
      <label className={FORM_FIELD_LABEL_CLASS}>{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        className={cn(
          "h-11 text-[17px]",
          readOnly && "cursor-default opacity-100 disabled:opacity-100",
        )}
      />
    </div>
  );
}
