"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PreferenceSliderField } from "@/components/preference-slider-field";
import { PreferenceSliderInput } from "@/components/preference-slider-input";
import { Button } from "@/components/ui/button";
import { SCREEN_REGULAR_CTA_CLASS } from "@/components/resume-upload-styles";
import {
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELDS_STACK_CLASS,
} from "@/components/form-field-styles";
import {
  MATCH_PREFERENCE_GROUPS,
  MATCH_SCORE_WEIGHT_CATEGORIES,
  MATCH_SCORE_WEIGHT_MAX,
  MATCH_SCORE_WEIGHT_MIN,
  MATCH_SCORE_WEIGHT_PRESETS,
  MATCH_SCORE_WEIGHT_STEP,
  areMatchScoreWeightsValid,
  matchScoreCustomPresetsEqual,
  matchScoreWeightsEqual,
  rebalanceMatchScoreWeights,
  resolveMatchScoreSelectionId,
  type MatchScoreCustomPreset,
  type MatchScoreSelectionId,
  type MatchScoreWeightKey,
  type MatchScoreWeightPreset,
  type MatchScoreWeights,
} from "@/lib/match-score-weights";
import { useHorizontalScrollAxisLock } from "@/lib/use-horizontal-scroll-axis-lock";
import { safeBottomOverlay } from "@/lib/safe-area";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/info-tooltip";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";

const PRESET_GAP_PX = 8;

const presetNavButtonClass = cn(
  "pointer-events-auto absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full",
  "border border-border/80 bg-card/95 text-foreground shadow-md backdrop-blur-sm",
  "transition-opacity hover:bg-card active:scale-95",
  "disabled:pointer-events-none disabled:opacity-0",
  "[appearance:none] [-webkit-appearance:none]",
);

function PresetChip({
  label,
  description,
  selected,
  isDefault,
  onSelect,
  onDelete,
}: {
  label: string;
  description: string;
  selected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative w-[9.75rem] shrink-0 snap-start">
      <button
        type="button"
        data-preset-card
        onClick={onSelect}
        aria-pressed={selected}
        aria-current={isDefault ? "true" : undefined}
        className={cn(
          "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
          onDelete && "pr-8",
          selected
            ? "border-primary bg-primary/10"
            : "border-border/70 bg-card hover:bg-muted/40",
        )}
      >
        <p
          className={cn(
            "text-[14px] font-semibold leading-snug",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          {label}
        </p>
        <p className="mt-1 line-clamp-2 min-h-[2.75em] text-[12px] leading-snug text-muted-foreground">
          {description}
        </p>
      </button>
      {isDefault ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2",
            "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5",
            "border border-emerald-600 bg-emerald-500 shadow-sm",
            "text-[10px] font-semibold uppercase tracking-wide text-white",
          )}
        >
          Default Preset
        </span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          className={cn(
            "absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full",
            "text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive",
            "[appearance:none] [-webkit-appearance:none]",
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
        >
          <X className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function PresetCarousel({
  selectedPresetId,
  defaultPresetId,
  customPresets,
  onApplyPreset,
  onSelectCustom,
  onRequestDeleteCustom,
}: {
  selectedPresetId: MatchScoreSelectionId | null;
  defaultPresetId: MatchScoreSelectionId;
  customPresets: MatchScoreCustomPreset[];
  onApplyPreset: (id: MatchScoreWeightPreset["id"]) => void;
  onSelectCustom: (id: string) => void;
  onRequestDeleteCustom: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useHorizontalScrollAxisLock(scrollRef);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    for (const child of el.children) {
      observer.observe(child);
    }

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [customPresets.length, updateScrollState]);

  useEffect(() => {
    const isCustom = customPresets.some((p) => p.id === selectedPresetId);
    if (!isCustom) return;
    const el = scrollRef.current;
    if (!el) return;
    // Newest customs render on the far left — pin the carousel there.
    el.scrollTo({ left: 0, behavior: "smooth" });
  }, [customPresets, selectedPresetId]);

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-preset-card]");
    if (!card) return;
    el.scrollBy({
      left: direction * (card.offsetWidth + PRESET_GAP_PX),
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-label="Previous presets"
        className={cn(presetNavButtonClass, "left-0")}
        disabled={!canScrollLeft}
        onClick={() => scrollByCard(-1)}
      >
        <ChevronLeft className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>

      <div
        ref={scrollRef}
        data-app-scroll-x
        className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Match preference presets"
      >
        {[...customPresets].reverse().map((preset) => (
          <PresetChip
            key={preset.id}
            label={preset.label}
            description={preset.description || "Custom"}
            selected={selectedPresetId === preset.id}
            isDefault={defaultPresetId === preset.id}
            onSelect={() => onSelectCustom(preset.id)}
            onDelete={() => onRequestDeleteCustom(preset.id)}
          />
        ))}
        {MATCH_SCORE_WEIGHT_PRESETS.map((preset) => (
          <PresetChip
            key={preset.id}
            label={preset.label}
            description={preset.description}
            selected={selectedPresetId === preset.id}
            isDefault={defaultPresetId === preset.id}
            onSelect={() => onApplyPreset(preset.id)}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Next presets"
        className={cn(presetNavButtonClass, "right-0")}
        disabled={!canScrollRight}
        onClick={() => scrollByCard(1)}
      >
        <ChevronRight className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

function ScoreWeightsGroup({
  weights,
  savedWeights,
  customPresets,
  savedCustomPresets,
  selectedPresetId,
  onSelectedPresetIdChange,
  onChange,
  onResetDefault,
  onDeleteCustomPreset,
  deleteBusy,
  isGuest,
}: {
  weights: MatchScoreWeights;
  savedWeights: MatchScoreWeights;
  customPresets: MatchScoreCustomPreset[];
  savedCustomPresets: MatchScoreCustomPreset[];
  selectedPresetId: MatchScoreSelectionId | null;
  onSelectedPresetIdChange: (id: MatchScoreSelectionId | null) => void;
  onChange: (next: MatchScoreWeights) => void;
  onResetDefault: () => void;
  onDeleteCustomPreset: (id: string) => void | Promise<void>;
  deleteBusy: boolean;
  isGuest: boolean;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const prevSavedRef = useRef({
    weights: savedWeights,
    customs: savedCustomPresets,
  });

  const visibleCustomPresets = isGuest ? [] : customPresets;
  const defaultPresetId = resolveMatchScoreSelectionId(
    savedWeights,
    isGuest ? [] : savedCustomPresets,
  );
  const pendingDelete =
    !isGuest && pendingDeleteId
      ? (customPresets.find((preset) => preset.id === pendingDeleteId) ?? null)
      : null;

  // After Save / discard: re-resolve selection when the active default weights change.
  // Adding a Custom keeps prior active weights — leave the newly selected card alone.
  useEffect(() => {
    const sameWeights = matchScoreWeightsEqual(
      prevSavedRef.current.weights,
      savedWeights,
    );
    const sameCustoms = matchScoreCustomPresetsEqual(
      prevSavedRef.current.customs,
      savedCustomPresets,
    );
    if (sameWeights && sameCustoms) return;
    const weightsChanged = !sameWeights;
    prevSavedRef.current = {
      weights: savedWeights,
      customs: savedCustomPresets,
    };
    if (!weightsChanged) return;
    onSelectedPresetIdChange(
      resolveMatchScoreSelectionId(
        savedWeights,
        isGuest ? [] : savedCustomPresets,
      ),
    );
  }, [savedWeights, savedCustomPresets, onSelectedPresetIdChange, isGuest]);

  function applyPreset(id: MatchScoreWeightPreset["id"]) {
    const preset = MATCH_SCORE_WEIGHT_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    onSelectedPresetIdChange(id);
    onChange({ ...preset.weights });
  }

  function applyCustom(id: string) {
    if (isGuest) return;
    const preset = customPresets.find((item) => item.id === id);
    if (!preset) return;
    onSelectedPresetIdChange(id);
    onChange({ ...preset.weights });
  }

  function updateWeight(key: MatchScoreWeightKey, value: number) {
    if (isGuest) return;
    // Any slider edit leaves preset selection — you're drafting a new Custom.
    if (selectedPresetId !== null) {
      onSelectedPresetIdChange(null);
    }
    onChange(rebalanceMatchScoreWeights(weights, key, value));
  }

  function resetDefault() {
    onSelectedPresetIdChange("balanced");
    onResetDefault();
  }

  async function confirmDelete() {
    if (isGuest || !pendingDeleteId) return;
    const id = pendingDeleteId;
    await onDeleteCustomPreset(id);
    setPendingDeleteId(null);
  }

  const draftingNewCustom = !isGuest && selectedPresetId === null;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 whitespace-nowrap text-[clamp(12px,3.6vw,15px)] font-semibold leading-tight tracking-tight text-foreground">
          Adjust category weighting to influence Fit Score
        </p>
        <InfoTooltip
          label="About category weighting"
          panelClassName="left-auto right-0 w-64"
          text={
            <span className="block space-y-1.5">
              <span className="block">
                Adjust category weighting sliders to influence your Fit Score.
                Higher weight means that category matters more when OnlyFit
                compares your resume to a job posting.
              </span>
              <span className="block">
                Example: If you&apos;re confident in your technical skills but
                transitioning into a new industry, increase Skills &amp; Tools
                and reduce Domain &amp; Background so transferable skills have a
                greater impact on your matches.
              </span>
            </span>
          }
        />
      </div>
      <div>
        <h2 className={FORM_FIELD_LABEL_CLASS}>Presets</h2>
        <div className="mt-2">
          <PresetCarousel
            selectedPresetId={selectedPresetId}
            defaultPresetId={defaultPresetId}
            customPresets={visibleCustomPresets}
            onApplyPreset={applyPreset}
            onSelectCustom={applyCustom}
            onRequestDeleteCustom={setPendingDeleteId}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className={FORM_FIELD_LABEL_CLASS}>Category Weighting</h2>
          <div className="flex shrink-0 items-center gap-2">
            {draftingNewCustom ? (
              <p className="text-[12px] leading-snug text-muted-foreground">
                Creating a new preset
              </p>
            ) : null}
            {!isGuest ? (
              <button
                type="button"
                onClick={resetDefault}
                className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
        <div className="relative mt-2">
          <div
            className={cn(
              "space-y-4",
              isGuest && "pointer-events-none select-none opacity-55",
            )}
            aria-hidden={isGuest || undefined}
          >
            {MATCH_SCORE_WEIGHT_CATEGORIES.map((category) => (
              <div
                key={category.key}
                className="rounded-xl border border-border/60 bg-card px-4 py-3.5"
              >
                <PreferenceSliderField
                  label={category.label}
                  valueDisplay={String(weights[category.key])}
                  valueSuffix="%"
                >
                  <PreferenceSliderInput
                    min={MATCH_SCORE_WEIGHT_MIN}
                    max={MATCH_SCORE_WEIGHT_MAX}
                    step={MATCH_SCORE_WEIGHT_STEP}
                    value={weights[category.key]}
                    onChange={(value) => updateWeight(category.key, value)}
                    tooltipLabel={`${weights[category.key]}%`}
                    ariaLabel={`${category.label} weight`}
                    ariaValueText={`${weights[category.key]} percent`}
                  />
                </PreferenceSliderField>
                <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
                  {category.description}
                </p>
              </div>
            ))}
          </div>

          {isGuest ? (
            <div className="absolute inset-0 z-10 flex items-start justify-center px-3 pt-6 pb-6">
              <div
                aria-hidden
                className="absolute inset-0 rounded-xl bg-background/45 backdrop-blur-[3px]"
              />
              <div className="relative z-10 w-full max-w-sm">
                <GuestUpgradePrompt
                  variant="categoryWeighting"
                  className="mx-0 shadow-lg"
                  forceGuest
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pendingDelete ? (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center px-4 sm:items-center ${safeBottomOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-custom-preset-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            disabled={deleteBusy}
            onClick={() => !deleteBusy && setPendingDeleteId(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <h2
              id="delete-custom-preset-title"
              className="text-[17px] font-semibold leading-snug"
            >
              Delete {pendingDelete.label}?
            </h2>
            <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
              This removes the saved custom weighting. You can create a new one
              anytime by editing the sliders and saving.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                disabled={deleteBusy}
                onClick={() => setPendingDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={cn(SCREEN_REGULAR_CTA_CLASS, "flex-1")}
                disabled={deleteBusy}
                onClick={() => void confirmDelete()}
              >
                {deleteBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Match Preferences body — preference groups are registry-driven so future
 * groups (remote, salary, company size, …) can mount beside score weights.
 */
export function MatchPreferencesPanel({
  weights,
  savedWeights,
  customPresets,
  savedCustomPresets,
  selectedPresetId,
  onSelectedPresetIdChange,
  onWeightsChange,
  onDeleteCustomPreset,
  deleteBusy = false,
  isGuest = false,
}: {
  weights: MatchScoreWeights;
  savedWeights: MatchScoreWeights;
  customPresets: MatchScoreCustomPreset[];
  savedCustomPresets: MatchScoreCustomPreset[];
  selectedPresetId: MatchScoreSelectionId | null;
  onSelectedPresetIdChange: (id: MatchScoreSelectionId | null) => void;
  onWeightsChange: (next: MatchScoreWeights) => void;
  onDeleteCustomPreset: (id: string) => void | Promise<void>;
  deleteBusy?: boolean;
  isGuest?: boolean;
}) {
  return (
    <div className={FORM_FIELDS_STACK_CLASS}>
      {MATCH_PREFERENCE_GROUPS.map((group) => {
        if (group.id === "scoreWeights") {
          return (
            <ScoreWeightsGroup
              key={group.id}
              weights={weights}
              savedWeights={savedWeights}
              customPresets={customPresets}
              savedCustomPresets={savedCustomPresets}
              selectedPresetId={selectedPresetId}
              onSelectedPresetIdChange={onSelectedPresetIdChange}
              onChange={onWeightsChange}
              onResetDefault={() =>
                onWeightsChange({
                  ...MATCH_SCORE_WEIGHT_PRESETS[0]!.weights,
                })
              }
              onDeleteCustomPreset={onDeleteCustomPreset}
              deleteBusy={deleteBusy}
              isGuest={isGuest}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

export function matchPreferencesCanSave(weights: MatchScoreWeights): boolean {
  return areMatchScoreWeightsValid(weights);
}
