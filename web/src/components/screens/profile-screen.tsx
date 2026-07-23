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
import {
  PRIMARY_FLOATING_CTA_CLASS,
  SCREEN_REGULAR_CTA_CLASS,
} from "@/components/resume-upload-styles";
import {
  MatchPreferencesPanel,
  matchPreferencesCanSave,
} from "@/components/match-preferences-panel";
import {
  fetchUserProfile,
  generalInfoDirty,
  initialProfileScreenState,
  matchScoreWeightsDirty,
  readNameFromAuthUser,
  saveMatchScoreWeights,
  saveProfileHeaderSnapshot,
  saveUserProfile,
  type UserProfile,
} from "@/lib/profile";
import {
  commitMatchPreferenceSave,
  matchScoreWeightsEqual,
  matchScoreWeightsFromProfile,
  MATCH_SCORE_CUSTOM_DESCRIPTION_MAX,
  nextCustomPresetLabel,
  removeMatchScoreCustomPreset,
  resolveMatchScoreSelectionId,
  wouldCreateMatchScoreCustomPreset,
  type MatchScoreSelectionId,
  type MatchScoreWeights,
  MATCH_SCORE_WEIGHT_PRESETS,
} from "@/lib/match-score-weights";
import { AppearanceModeSetting, type AppearanceMode } from "@/components/appearance-mode-setting";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import { TimezoneSelect } from "@/components/timezone-select";
import { LocationSelect } from "@/components/location-select";
import { deleteAccount } from "@/lib/delete-account";
import { navigateApp } from "@/lib/navigate-app";
import {
  QA_ACCOUNT_MODE_CHANGED_EVENT,
  resolveIsGuestUser,
} from "@/lib/qa-account-mode";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import { cn } from "@/lib/utils";
import { SkeletonProfileScreen } from "@/components/ui/skeletons";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
} from "@/components/ui/sticky-bottom-cta";
import { safeBottomOverlay } from "@/lib/safe-area";

type ProfileTab = "general" | "matchPreferences" | "settings";

const PROFILE_TABS: { id: ProfileTab; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General Info", icon: CircleUser },
  { id: "matchPreferences", label: "Preferences", icon: SlidersHorizontal },
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "preferences" || tab === "matchPreferences") {
      setActiveTab("matchPreferences");
      params.delete("tab");
      const next = params.toString();
      window.history.replaceState(
        null,
        "",
        next ? `/profile?${next}` : "/profile",
      );
    }
  }, []);
  const [busy, setBusy] = useState(false);
  const [deletingCustomPreset, setDeletingCustomPreset] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("dark");
  const [savedAppearanceMode, setSavedAppearanceMode] = useState<AppearanceMode>("dark");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [leaveConfirmTab, setLeaveConfirmTab] = useState<ProfileTab | null>(null);
  const [customNameModalOpen, setCustomNameModalOpen] = useState(false);
  const [customNameDraft, setCustomNameDraft] = useState("");
  const [customDescriptionDraft, setCustomDescriptionDraft] = useState("");
  const customNameInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const appearanceSyncedRef = useRef(false);
  const generalInfoChanged = generalInfoDirty(profile, savedProfile);
  const settingsAppearanceChanged = appearanceMode !== savedAppearanceMode;
  const matchWeights = matchScoreWeightsFromProfile(profile.matchScoreWeights);
  const matchCustomPresets = profile.matchScoreCustomPresets;
  const matchWeightsChanged = matchScoreWeightsDirty(profile, savedProfile);
  const matchWeightsValid = matchPreferencesCanSave(matchWeights);
  const [matchSelectedPresetId, setMatchSelectedPresetId] = useState<
    MatchScoreSelectionId | null
  >("balanced");
  const creatingNewMatchPreset =
    activeTab === "matchPreferences" &&
    !isGuest &&
    matchSelectedPresetId === null &&
    matchWeightsChanged;
  const selectingNamedPreset =
    activeTab === "matchPreferences" &&
    !isGuest &&
    matchSelectedPresetId != null;
  const matchPreferencesCtaLabel = creatingNewMatchPreset
    ? "Add Preset"
    : selectingNamedPreset
      ? "Use as Default Preset"
      : "Save Changes";
  const tabHasUnsavedChanges =
    activeTab === "general"
      ? generalInfoChanged
      : activeTab === "matchPreferences"
        ? !isGuest && matchWeightsChanged
        : settingsAppearanceChanged;
  const guestPreferencesLocked = isGuest && activeTab === "matchPreferences";
  const showSaveButton =
    !profileLoading &&
    !guestPreferencesLocked &&
    (activeTab === "general" ||
      activeTab === "settings" ||
      activeTab === "matchPreferences");

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

      const guest = resolveIsGuestUser(user);
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
        setMatchSelectedPresetId(
          resolveMatchScoreSelectionId(
            matchScoreWeightsFromProfile(loaded.matchScoreWeights),
            loaded.matchScoreCustomPresets,
          ),
        );
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
    function onQaModeChange() {
      const supabase = createClient();
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const guest = resolveIsGuestUser(user);
        setIsGuest(guest);
        saveProfileHeaderSnapshot({
          fullName: profile.fullName?.trim() || null,
          isGuest: guest,
        });
      })();
    }
    window.addEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, onQaModeChange);
    return () => {
      window.removeEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, onQaModeChange);
    };
  }, [profile.fullName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  useEffect(() => {
    if (!customNameModalOpen) return;
    const frame = window.requestAnimationFrame(() => {
      customNameInputRef.current?.focus();
      customNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customNameModalOpen]);

  useEffect(() => {
    if (!tabHasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [tabHasUnsavedChanges]);

  function patch(next: Partial<UserProfile>) {
    setProfile((p) => ({ ...p, ...next }));
  }

  function setMatchWeights(next: MatchScoreWeights) {
    patch({ matchScoreWeights: next });
  }

  async function deleteCustomPreset(id: string) {
    const removed = matchCustomPresets.find((preset) => preset.id === id);
    if (!removed) return;

    const remaining = removeMatchScoreCustomPreset(matchCustomPresets, id);
    const wasSelected = matchSelectedPresetId === id;
    const weightsMatchedRemoved = matchScoreWeightsEqual(
      matchWeights,
      removed.weights,
    );

    const balanced = { ...MATCH_SCORE_WEIGHT_PRESETS[0]!.weights };
    const nextWeights =
      wasSelected || weightsMatchedRemoved ? balanced : matchWeights;
    const nextSelection =
      wasSelected || weightsMatchedRemoved
        ? ("balanced" as const)
        : matchSelectedPresetId;

    setDeletingCustomPreset(true);
    const result = await saveMatchScoreWeights(nextWeights, remaining);
    setDeletingCustomPreset(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const next = {
      ...profile,
      matchScoreWeights: nextWeights,
      matchScoreCustomPresets: remaining,
    };
    setProfile(next);
    setSavedProfile(structuredClone(next));
    setMatchSelectedPresetId(nextSelection);
    toast.success(`${removed.label} deleted.`);
  }

  function requestTabChange(nextTab: ProfileTab) {
    if (nextTab === activeTab) return;
    if (tabHasUnsavedChanges) {
      setLeaveConfirmTab(nextTab);
      return;
    }
    setActiveTab(nextTab);
  }

  function discardAndLeave() {
    if (!leaveConfirmTab) return;
    const restored = structuredClone(savedProfile);
    setProfile(restored);
    setMatchSelectedPresetId(
      resolveMatchScoreSelectionId(
        matchScoreWeightsFromProfile(restored.matchScoreWeights),
        restored.matchScoreCustomPresets,
      ),
    );
    setAppearanceMode(savedAppearanceMode);
    setActiveTab(leaveConfirmTab);
    setLeaveConfirmTab(null);
  }

  async function persistMatchPreferences(
    customLabel?: string,
    customDescription?: string,
  ) {
    const creatingCustom = Boolean(customLabel?.trim());
    const committed = commitMatchPreferenceSave({
      weights: matchWeights,
      customPresets: matchCustomPresets,
      customLabel,
      customDescription,
      ...(creatingCustom
        ? {
            keepActiveWeights: matchScoreWeightsFromProfile(
              savedProfile.matchScoreWeights,
            ),
          }
        : {}),
    });

    setBusy(true);
    const result = await saveMatchScoreWeights(
      committed.weights,
      committed.customPresets,
    );
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return false;
    }

    const nextSaved = {
      ...profile,
      fullName: profile.fullName?.trim() || null,
      country: profile.country?.trim() || null,
      timezone: profile.timezone?.trim() || null,
      matchScoreWeights: committed.weights,
      matchScoreCustomPresets: committed.customPresets,
    };
    setSavedProfile(structuredClone(nextSaved));

    const created = committed.createdCustom;
    // After adding a Custom: select it and show its weights in the UI, but keep
    // the persisted active default unchanged until "Use as Default Preset".
    setProfile(
      created
        ? { ...nextSaved, matchScoreWeights: created.weights }
        : nextSaved,
    );
    setMatchSelectedPresetId(committed.selectedPresetId);
    setCustomNameModalOpen(false);
    setCustomNameDraft("");
    setCustomDescriptionDraft("");

    toast.success(
      created ? `Added ${created.label}.` : "Profile updated.",
    );
    return true;
  }

  async function confirmCustomPresetName() {
    const label = customNameDraft.trim();
    if (!label) {
      toast.error("Enter a name for this preset.");
      customNameInputRef.current?.focus();
      return;
    }
    await persistMatchPreferences(
      label,
      customDescriptionDraft.trim(),
    );
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
    } else if (activeTab === "matchPreferences") {
      if (!matchWeightsChanged) {
        toast.message("No changes to save.");
        return;
      }
      if (!matchWeightsValid) {
        toast.error("Weights must total exactly 100% before saving.");
        return;
      }
      if (wouldCreateMatchScoreCustomPreset(matchWeights, matchCustomPresets)) {
        if (isGuest) {
          toast.message("Create a profile to save custom presets.");
          return;
        }
        setCustomNameDraft(nextCustomPresetLabel(matchCustomPresets));
        setCustomDescriptionDraft("");
        setCustomNameModalOpen(true);
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
      matchScoreWeights:
        activeTab === "matchPreferences"
          ? matchWeights
          : profile.matchScoreWeights,
    };

    setBusy(true);
    let error: string | null = null;
    if (activeTab === "settings") {
      setTheme(appearanceMode);
      setSavedAppearanceMode(appearanceMode);
    } else if (activeTab === "matchPreferences") {
      await persistMatchPreferences();
      return;
    } else {
      const result = await saveUserProfile(normalized);
      error = result.error;
      if (!error) {
        setProfile(normalized);
        setSavedProfile(structuredClone(normalized));
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

      <StickyScreenBody
        ref={scrollRef}
        className={cn(
          "pb-4",
          guestPreferencesLocked && "overflow-y-hidden overscroll-none",
        )}
      >
        <nav
          className={cn(
            "sticky top-0 z-20 flex justify-start gap-8 overflow-x-auto",
            "border-b border-border/60 bg-background/95 px-4 pt-4 backdrop-blur-md",
          )}
          aria-label="Profile sections"
        >
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => requestTabChange(tab.id)}
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

        <div key={activeTab} className="flex flex-col gap-8 pt-8">
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
          ) : activeTab === "matchPreferences" ? (
            <MatchPreferencesPanel
              weights={matchWeights}
              savedWeights={matchScoreWeightsFromProfile(
                savedProfile.matchScoreWeights,
              )}
              customPresets={matchCustomPresets}
              savedCustomPresets={savedProfile.matchScoreCustomPresets}
              selectedPresetId={matchSelectedPresetId}
              onSelectedPresetIdChange={setMatchSelectedPresetId}
              onWeightsChange={setMatchWeights}
              onDeleteCustomPreset={deleteCustomPreset}
              deleteBusy={deletingCustomPreset}
              isGuest={isGuest}
            />
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
                  className={cn("mt-4", SCREEN_REGULAR_CTA_CLASS)}
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
        <StickyBottomCta variant="bare" inactive={busy}>
          <Button
            type="button"
            className={PRIMARY_FLOATING_CTA_CLASS}
            disabled={
              busy ||
              (activeTab === "matchPreferences" &&
                (!matchWeightsValid || !matchWeightsChanged)) ||
              (activeTab === "general" && !generalInfoChanged) ||
              (activeTab === "settings" && !settingsAppearanceChanged)
            }
            aria-busy={busy}
            aria-label={
              busy
                ? "Saving profile"
                : activeTab === "matchPreferences"
                  ? matchPreferencesCtaLabel
                  : "Save changes"
            }
            onClick={save}
          >
            {busy ? (
              <CtaSpinner />
            ) : activeTab === "matchPreferences" ? (
              matchPreferencesCtaLabel
            ) : (
              "Save Changes"
            )}
          </Button>
        </StickyBottomCta>
      ) : null}

      {customNameModalOpen ? (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center px-4 sm:items-center ${safeBottomOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-custom-preset-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              setCustomNameModalOpen(false);
              setCustomNameDraft("");
              setCustomDescriptionDraft("");
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <h2
              id="name-custom-preset-title"
              className="text-[17px] font-semibold leading-snug"
            >
              Name this preset
            </h2>
            <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
              Give your custom weighting a name so you can find it later.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  className={FORM_FIELD_LABEL_CLASS}
                  htmlFor="custom-preset-name"
                >
                  Preset name
                </label>
                <Input
                  ref={customNameInputRef}
                  id="custom-preset-name"
                  value={customNameDraft}
                  onChange={(event) => setCustomNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void confirmCustomPresetName();
                    }
                  }}
                  placeholder="e.g. Skills heavy"
                  maxLength={40}
                  disabled={busy}
                  className={cn("mt-1.5 h-11", FORM_FIELD_CONTROL_TEXT_CLASS)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    className={FORM_FIELD_LABEL_CLASS}
                    htmlFor="custom-preset-description"
                  >
                    Description
                  </label>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {customDescriptionDraft.length}/
                    {MATCH_SCORE_CUSTOM_DESCRIPTION_MAX}
                  </span>
                </div>
                <Input
                  id="custom-preset-description"
                  value={customDescriptionDraft}
                  onChange={(event) =>
                    setCustomDescriptionDraft(
                      event.target.value.slice(
                        0,
                        MATCH_SCORE_CUSTOM_DESCRIPTION_MAX,
                      ),
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void confirmCustomPresetName();
                    }
                  }}
                  placeholder="e.g. Skills lead"
                  maxLength={MATCH_SCORE_CUSTOM_DESCRIPTION_MAX}
                  disabled={busy}
                  className={cn("mt-1.5 h-11", FORM_FIELD_CONTROL_TEXT_CLASS)}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                disabled={busy}
                onClick={() => {
                  setCustomNameModalOpen(false);
                  setCustomNameDraft("");
                  setCustomDescriptionDraft("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                disabled={busy}
                onClick={() => void confirmCustomPresetName()}
              >
                {busy ? <CtaSpinner /> : "Save preset"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {leaveConfirmTab ? (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center px-4 sm:items-center ${safeBottomOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-changes-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setLeaveConfirmTab(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <h2
              id="unsaved-changes-title"
              className="text-[17px] font-semibold leading-snug"
            >
              Unsaved changes
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground leading-snug">
              You have unsaved changes. Discard changes and leave?
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                onClick={() => setLeaveConfirmTab(null)}
              >
                Stay
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                onClick={discardAndLeave}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
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
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
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
