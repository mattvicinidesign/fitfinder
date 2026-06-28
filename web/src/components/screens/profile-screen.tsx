"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import { CircleUser, Settings, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { Input } from "@/components/ui/input";
import {
  FORM_FIELD_GROUP_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELDS_STACK_CLASS,
  FORM_FIELD_CONTROL_TEXT_CLASS,
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
  fetchUserProfile,
  generalInfoDirty,
  initialProfileScreenState,
  isPreferencesValid,
  preferencesDirty,
  readNameFromAuthUser,
  saveProfileHeaderSnapshot,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";
import {
  pickLocalProfilePrefs,
  saveLocalProfilePrefs,
} from "@/lib/local-profile-prefs";
import { AppearanceModeSetting, type AppearanceMode } from "@/components/appearance-mode-setting";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import { TimezoneSelect } from "@/components/timezone-select";
import { LocationSelect } from "@/components/location-select";
import { deleteAccount } from "@/lib/delete-account";
import { navigateApp } from "@/lib/navigate-app";
import { fetchLatestUserResume } from "@/lib/resume-documents";
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

const PROFILE_TABS: { id: ProfileTab; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General Info", icon: CircleUser },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", icon: Settings },
];

export function ProfileScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const initial = initialProfileScreenState();
  const [profileLoading, setProfileLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(initial.isGuest);
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [savedProfile, setSavedProfile] = useState<UserProfile>(initial.savedProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("dark");
  const [savedAppearanceMode, setSavedAppearanceMode] = useState<AppearanceMode>("dark");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const appearanceSyncedRef = useRef(false);
  const generalInfoChanged = generalInfoDirty(profile, savedProfile);
  const preferencesChanged = preferencesDirty(profile, savedProfile);
  const settingsAppearanceChanged = appearanceMode !== savedAppearanceMode;
  const showSaveButton =
    !profileLoading &&
    (activeTab === "general" ||
      activeTab === "preferences" ||
      activeTab === "settings");

  const profileTitle =
    isGuest || !profile.fullName?.trim() ? "Profile" : profile.fullName.trim();

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setProfileLoading(false);
        return;
      }

      const guest = user.is_anonymous ?? false;
      setEmail(user.email ?? null);
      setIsGuest(guest);

      const metaName = readNameFromAuthUser(user);
      if (metaName) {
        setProfile((current) =>
          current.fullName?.trim() ? current : { ...current, fullName: metaName },
        );
      }

      const existing = await fetchUserProfile();
      if (existing) {
        const loaded = structuredClone(existing);
        setProfile(loaded);
        setSavedProfile(structuredClone(existing));
        saveLocalProfilePrefs(pickLocalProfilePrefs(loaded));
        saveProfileHeaderSnapshot({
          fullName: loaded.fullName?.trim() || null,
          isGuest: guest,
        });
      } else {
        saveProfileHeaderSnapshot({
          fullName: metaName,
          isGuest: guest,
        });
      }
      const latestResume = await fetchLatestUserResume();
      if (latestResume) setResumeFileName(latestResume.fileName);
      setProfileLoading(false);
    })();
  }, []);

  // Sync theme once on load — do not overwrite staged appearance edits when
  // theme resolves asynchronously on native.
  useEffect(() => {
    if (theme === undefined || appearanceSyncedRef.current) return;
    const resolved: AppearanceMode = theme === "light" ? "light" : "dark";
    setAppearanceMode(resolved);
    setSavedAppearanceMode(resolved);
    appearanceSyncedRef.current = true;
  }, [theme]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  function patch(next: Partial<UserProfile>) {
    setProfile((p) => ({ ...p, ...next }));
  }

  async function save() {
    if (activeTab === "general") {
      if (!generalInfoChanged) {
        toast.message("No changes to save.");
        return;
      }
      if (!profile.fullName?.trim()) {
        toast.error("Enter your name to save.");
        return;
      }
      if (!profile.country?.trim()) {
        toast.error("Select your location to save.");
        return;
      }
      if (!profile.timezone?.trim()) {
        toast.error("Select your timezone to save.");
        return;
      }
    } else if (activeTab === "preferences") {
      if (!preferencesChanged) {
        toast.message("No changes to save.");
        return;
      }
      if (!isPreferencesValid(profile)) {
        toast.error("Complete all preference fields to save.");
        return;
      }
    } else if (activeTab === "settings") {
      if (!settingsAppearanceChanged) {
        toast.message("No changes to save.");
        return;
      }
    } else {
      return;
    }

    const normalized: UserProfile = {
      ...profile,
      fullName: profile.fullName?.trim() || null,
      country: profile.country?.trim() || null,
      timezone: profile.timezone?.trim() || null,
    };

    setBusy(true);
    let error: string | null = null;
    if (activeTab === "settings") {
      setTheme(appearanceMode);
      setSavedAppearanceMode(appearanceMode);
    } else {
      const result = await saveUserProfile(normalized);
      error = result.error;
      if (!error) {
        setProfile(normalized);
        setSavedProfile(structuredClone(normalized));
        saveLocalProfilePrefs(pickLocalProfilePrefs(normalized));
      }
    }
    setBusy(false);

    if (error) toast.error(error);
    else toast.success("Profile updated.");
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
      <IosLargeTitle title={profileTitle} />

      <StickyScreenBody ref={scrollRef} className="py-4">
        <div key={activeTab} className="flex flex-col gap-8">
        <nav
          className="mx-4 flex justify-start gap-8 border-b border-border/60 overflow-x-auto"
          aria-label="Profile sections"
        >
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative shrink-0 px-0.5 pb-2 pt-1 text-[13px] font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
                {tab.label}
              </span>
              {activeTab === tab.id ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
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
            <LocationSelect
              value={profile.country}
              onChange={(v) => patch({ country: v })}
            />
            <TimezoneSelect
              id="profile-timezone"
              value={profile.timezone}
              onChange={(timezone) => patch({ timezone })}
            />
            <div className={FORM_FIELD_GROUP_CLASS}>
              <label className={FORM_FIELD_LABEL_CLASS}>Resume</label>
              <ResumeFilePicker
                className="min-h-[140px]"
                fileName={resumeFileName}
                onParsed={({ fileName }) => setResumeFileName(fileName)}
              />
            </div>
          </div>
        ) : activeTab === "preferences" ? (
          <div className={FORM_FIELDS_STACK_CLASS}>
            <MinimumHourlyRateSlider
              label="Minimum hourly rate"
              value={profile.minimumHourlyRate}
              onChange={(minimumHourlyRate) => patch({ minimumHourlyRate })}
            />

            <Section title="Employer Type">
              <ChipMultiSelect
                options={COMPANY_TYPE_OPTIONS}
                value={profile.preferredCompanyTypes}
                onChange={(v) => patch({ preferredCompanyTypes: v })}
              />
            </Section>

            <EmployerRatingSlider
              label="Minimum client rating"
              value={profile.preferredMinimumEmployerRating}
              onChange={(preferredMinimumEmployerRating) =>
                patch({ preferredMinimumEmployerRating })
              }
            />

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
              <AppearanceModeSetting
                value={appearanceMode}
                onChange={setAppearanceMode}
              />
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

      {showSaveButton ? (
        <StickyBottomCta variant="bare">
          <Button
            type="button"
            className="w-full h-12 rounded-xl"
            disabled={busy}
            aria-busy={busy}
            aria-label={busy ? "Saving profile" : "Save profile"}
            onClick={save}
          >
            {busy ? <CtaSpinner /> : "Save profile"}
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
          "h-11",
          FORM_FIELD_CONTROL_TEXT_CLASS,
          readOnly && "cursor-default opacity-100 disabled:opacity-100",
        )}
      />
    </div>
  );
}
