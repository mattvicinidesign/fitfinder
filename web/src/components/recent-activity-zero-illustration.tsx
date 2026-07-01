import { cn } from "@/lib/utils";

const PRIMARY = "#0475ef";
const INK = "#061420";
const PAPER = "#ffffff";
const MUTED = "#64748b";

/** Empty recent activity — quiet timeline / report stack. */
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
      <ellipse cx="110" cy="92" rx="78" ry="48" fill={PRIMARY} fillOpacity="0.08" />

      <rect
        x="44"
        y="28"
        width="112"
        height="108"
        rx="14"
        fill={INK}
        fillOpacity="0.42"
        stroke="#243044"
        strokeWidth="1.5"
      />
      <rect x="52" y="36" width="96" height="92" rx="10" fill={PAPER} fillOpacity="0.96" />

      <rect x="64" y="50" width="52" height="4" rx="2" fill={INK} fillOpacity="0.16" />
      <rect x="64" y="60" width="36" height="3" rx="1.5" fill={INK} fillOpacity="0.08" />

      <rect x="64" y="76" width="44" height="3" rx="1.5" fill={INK} fillOpacity="0.1" />
      <rect x="64" y="84" width="56" height="3" rx="1.5" fill={INK} fillOpacity="0.07" />
      <rect x="64" y="92" width="40" height="3" rx="1.5" fill={INK} fillOpacity="0.07" />

      <rect x="64" y="108" width="48" height="3" rx="1.5" fill={INK} fillOpacity="0.1" />
      <rect x="64" y="116" width="32" height="3" rx="1.5" fill={INK} fillOpacity="0.07" />

      <circle cx="152" cy="54" r="16" fill={INK} fillOpacity="0.55" stroke={PRIMARY} strokeWidth="1.5" />
      <path
        d="M146 54 H158 M152 48 V60"
        stroke={PRIMARY}
        strokeWidth="2"
        strokeLinecap="round"
      />

      <g transform="translate(168 108)" opacity="0.7">
        <circle cx="0" cy="0" r="10" fill={PRIMARY} fillOpacity="0.16" />
        <path
          d="M0 6 L12 0 L10 8 L18 10 L6 18 L8 10 Z"
          fill={PRIMARY}
          fillOpacity="0.45"
        />
      </g>

      <circle cx="36" cy="118" r="4" fill={MUTED} fillOpacity="0.35" />
      <circle cx="28" cy="44" r="3" fill={PAPER} fillOpacity="0.35" />
    </svg>
  );
}
