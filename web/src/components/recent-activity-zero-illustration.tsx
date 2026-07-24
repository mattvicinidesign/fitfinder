import { cn } from "@/lib/utils";

const PRIMARY = "#0475ef";
const INK = "#061420";
const MUTED = "#64748b";
const RING_TRACK = "#243044";

/** Empty recent activity — Fit Score ring waiting for the first analysis. */
export function RecentActivityZeroIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 220 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <ellipse cx="110" cy="98" rx="82" ry="46" fill={PRIMARY} fillOpacity="0.07" />
      <circle cx="42" cy="48" r="3" fill={MUTED} fillOpacity="0.35" />
      <circle cx="178" cy="128" r="4" fill={PRIMARY} fillOpacity="0.22" />
      <circle cx="186" cy="52" r="2.5" fill={MUTED} fillOpacity="0.3" />

      {/* Soft frame */}
      <rect
        x="48"
        y="22"
        width="124"
        height="124"
        rx="28"
        fill={INK}
        fillOpacity="0.45"
        stroke={RING_TRACK}
        strokeWidth="1.5"
      />

      {/* Score ring track */}
      <circle
        cx="110"
        cy="84"
        r="38"
        stroke={RING_TRACK}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Partial primary arc — ready / waiting */}
      <circle
        cx="110"
        cy="84"
        r="38"
        stroke={PRIMARY}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="58 240"
        strokeDashoffset="12"
        transform="rotate(-90 110 84)"
        opacity="0.95"
      />

      {/* Inner hub */}
      <circle cx="110" cy="84" r="24" fill={INK} fillOpacity="0.72" />
      <text
        x="110"
        y="80"
        textAnchor="middle"
        fill={PRIMARY}
        fillOpacity="0.9"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="15"
        fontWeight="700"
      >
        —
      </text>
      <text
        x="110"
        y="96"
        textAnchor="middle"
        fill={MUTED}
        fillOpacity="0.85"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.08em"
      >
        FIT
      </text>

      {/* Resume ↔ job nodes */}
      <g transform="translate(68 138)">
        <rect
          x="0"
          y="0"
          width="34"
          height="14"
          rx="7"
          fill={PRIMARY}
          fillOpacity="0.14"
          stroke={PRIMARY}
          strokeWidth="1"
          strokeOpacity="0.45"
        />
        <circle cx="10" cy="7" r="2.5" fill={PRIMARY} fillOpacity="0.7" />
        <rect x="16" y="5" width="12" height="2" rx="1" fill={MUTED} fillOpacity="0.55" />
        <rect x="16" y="9" width="8" height="2" rx="1" fill={MUTED} fillOpacity="0.35" />
      </g>

      <path
        d="M108 145 H112"
        stroke={MUTED}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.55"
      />

      <g transform="translate(118 138)">
        <rect
          x="0"
          y="0"
          width="34"
          height="14"
          rx="7"
          fill={MUTED}
          fillOpacity="0.12"
          stroke={RING_TRACK}
          strokeWidth="1"
        />
        <rect x="8" y="4" width="18" height="2" rx="1" fill={MUTED} fillOpacity="0.45" />
        <rect x="8" y="8" width="12" height="2" rx="1" fill={MUTED} fillOpacity="0.3" />
      </g>
    </svg>
  );
}
