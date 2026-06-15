import {
  parseHourlyRateFromLabel,
  profileOnboardingHourlyFloor,
} from "@/lib/posting-details";
import { isExplicitClientAvgPayRate } from "@/lib/client-quality-scoring";
import { coerceProfileNumeric } from "@/lib/employer-rating-match";
import type { Compensation } from "@/lib/types";

/** Client avg within this fraction below the profile floor still counts as a match. */
export const AVG_PAY_VICINITY_SLACK = 0.15;

export interface ClientAvgPayMatchDetail {
  badgeLabel: string;
  identified: boolean;
  compareToProfile: boolean;
  matched: boolean;
  points: number | null;
}

export function resolveProfileHourlyFloor(
  profileCompensation?: Compensation | null,
  profileMinimumHourlyRate?: number | null,
): number | null {
  const fromComp = profileOnboardingHourlyFloor(profileCompensation);
  if (fromComp != null && fromComp > 0) return fromComp;
  const fromPref = coerceProfileNumeric(profileMinimumHourlyRate);
  if (fromPref != null && fromPref > 0) return fromPref;
  return null;
}

export function isClientAvgPayWithinProfileVicinity(
  clientRate: number,
  profileFloor: number,
): boolean {
  if (!Number.isFinite(clientRate) || !Number.isFinite(profileFloor) || profileFloor <= 0) {
    return false;
  }
  return clientRate >= profileFloor * (1 - AVG_PAY_VICINITY_SLACK);
}

export function buildClientAvgPayMatchDetail({
  avgPayLabel,
  profileCompensation,
  profileMinimumHourlyRate,
}: {
  avgPayLabel?: string | null;
  profileCompensation?: Compensation | null;
  profileMinimumHourlyRate?: number | null;
}): ClientAvgPayMatchDetail {
  const value = avgPayLabel?.trim() ?? "";
  if (!value || !isExplicitClientAvgPayRate(value)) {
    return {
      badgeLabel: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const clientRate = parseHourlyRateFromLabel(value);
  if (clientRate == null) {
    return {
      badgeLabel: value,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const floor = resolveProfileHourlyFloor(
    profileCompensation,
    profileMinimumHourlyRate,
  );
  if (floor == null) {
    return {
      badgeLabel: value,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const matched = isClientAvgPayWithinProfileVicinity(clientRate, floor);

  return {
    badgeLabel: value,
    identified: true,
    compareToProfile: true,
    matched,
    points: matched ? 100 : 0,
  };
}
