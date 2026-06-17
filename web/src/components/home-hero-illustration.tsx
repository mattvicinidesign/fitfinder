import { cn } from "@/lib/utils";

const EMERALD = "#34d399";
const PAPER = "#ffffff";
const INK = "#061420";

function CheckBadge({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="7" fill={EMERALD} fillOpacity="0.22" />
      <circle cx={cx} cy={cy} r="5.5" fill={EMERALD} />
      <path
        d={`M${cx - 2.2} ${cy + 0.2} L${cx - 0.4} ${cy + 2} L${cx + 2.6} ${cy - 1.6}`}
        stroke={PAPER}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Home hero — resume with qualification checks. */
export function HomeHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 148 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      {/* Soft depth behind document */}
      <rect
        x="26"
        y="16"
        width="88"
        height="112"
        rx="10"
        fill={INK}
        fillOpacity="0.28"
        transform="rotate(4 70 72)"
      />

      {/* Resume page */}
      <g transform="rotate(-3 70 72)">
        <rect x="22" y="12" width="88" height="112" rx="10" fill={PAPER} fillOpacity="0.96" />
        <rect
          x="22"
          y="12"
          width="88"
          height="112"
          rx="10"
          stroke={PAPER}
          strokeOpacity="0.35"
          strokeWidth="1"
        />

        {/* Header band */}
        <rect x="22" y="12" width="88" height="24" rx="10" fill={INK} fillOpacity="0.06" />
        <rect x="22" y="28" width="88" height="8" fill={PAPER} fillOpacity="0.96" />

        {/* Avatar + name lines */}
        <circle cx="38" cy="30" r="9" fill={INK} fillOpacity="0.1" />
        <circle cx="38" cy="30" r="7" fill={INK} fillOpacity="0.16" />
        <rect x="52" y="24" width="34" height="3.5" rx="1.75" fill={INK} fillOpacity="0.22" />
        <rect x="52" y="31" width="22" height="2.5" rx="1.25" fill={INK} fillOpacity="0.12" />

        {/* Section label */}
        <rect x="32" y="46" width="28" height="2.5" rx="1.25" fill={INK} fillOpacity="0.18" />

        {/* Experience rows + checks */}
        <rect x="32" y="56" width="40" height="2.5" rx="1.25" fill={INK} fillOpacity="0.14" />
        <rect x="32" y="62" width="52" height="2" rx="1" fill={INK} fillOpacity="0.08" />
        <CheckBadge cx={96} cy={59} />

        <rect x="32" y="74" width="36" height="2.5" rx="1.25" fill={INK} fillOpacity="0.14" />
        <rect x="32" y="80" width="48" height="2" rx="1" fill={INK} fillOpacity="0.08" />
        <CheckBadge cx={96} cy={77} />

        <rect x="32" y="92" width="42" height="2.5" rx="1.25" fill={INK} fillOpacity="0.14" />
        <rect x="32" y="98" width="44" height="2" rx="1" fill={INK} fillOpacity="0.08" />
        <CheckBadge cx={96} cy={95} />

        {/* Footer accent line */}
        <rect x="32" y="110" width="24" height="2" rx="1" fill={EMERALD} fillOpacity="0.55" />

        {/* Folded corner */}
        <path
          d="M98 12 H110 C104 12 98 18 98 24 V12 Z"
          fill={INK}
          fillOpacity="0.06"
        />
        <path d="M98 12 L110 12 L98 24 Z" fill={INK} fillOpacity="0.1" />
      </g>

      {/* Floating check — upper right */}
      <CheckBadge cx={118} cy={28} />

      {/* Subtle spark */}
      <circle cx="14" cy="44" r="3" fill={EMERALD} fillOpacity="0.35" />
      <circle cx="18" cy="104" r="2" fill={PAPER} fillOpacity="0.35" />
    </svg>
  );
}
