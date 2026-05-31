import { cn } from "@/lib/utils";

/** Static onboarding hero — resume-to-job fit, not the brand logo. */
export function WelcomeHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      {/* Resume */}
      <g transform="translate(24 36) rotate(-6)">
        <rect
          width="88"
          height="112"
          rx="10"
          fill="#061420"
          stroke="#243044"
          strokeWidth="1.5"
        />
        <circle cx="44" cy="28" r="14" fill="#1e293b" />
        <path
          d="M38 28a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z"
          fill="#94a3b8"
          fillOpacity="0.5"
        />
        <rect x="20" y="50" width="48" height="5" rx="2.5" fill="#243044" />
        <rect x="20" y="62" width="40" height="4" rx="2" fill="#243044" />
        <rect x="20" y="74" width="44" height="4" rx="2" fill="#243044" />
        <rect x="20" y="86" width="36" height="4" rx="2" fill="#243044" />
        <rect x="20" y="98" width="42" height="4" rx="2" fill="#243044" />
      </g>

      {/* Job posting */}
      <g transform="translate(152 28) rotate(5)">
        <rect
          width="104"
          height="120"
          rx="10"
          fill="#061420"
          stroke="#243044"
          strokeWidth="1.5"
        />
        <rect x="14" y="16" width="76" height="10" rx="3" fill="#0475ef" fillOpacity="0.25" />
        <rect x="14" y="16" width="34" height="10" rx="3" fill="#0475ef" />
        <rect x="14" y="36" width="52" height="6" rx="3" fill="#243044" />
        <rect x="14" y="50" width="68" height="4" rx="2" fill="#243044" />
        <rect x="14" y="60" width="60" height="4" rx="2" fill="#243044" />
        <rect x="14" y="70" width="64" height="4" rx="2" fill="#243044" />
        <rect x="14" y="88" width="40" height="18" rx="6" fill="#1e293b" stroke="#0475ef" strokeWidth="1" />
        <rect x="20" y="95" width="18" height="4" rx="2" fill="#0475ef" fillOpacity="0.7" />
      </g>

      {/* Connection arc */}
      <path
        d="M108 98 C128 78 148 78 168 98"
        stroke="#0475ef"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity="0.55"
      />

      {/* Fit score badge */}
      <circle cx="140" cy="108" r="34" fill="#000610" stroke="#0475ef" strokeWidth="3" />
      <circle
        cx="140"
        cy="108"
        r="28"
        fill="none"
        stroke="#243044"
        strokeWidth="5"
      />
      <path
        d="M140 80 A28 28 0 0 1 162.4 120"
        stroke="#0475ef"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <text
        x="140"
        y="106"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="18"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        87
      </text>
      <text
        x="140"
        y="122"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="9"
        fontWeight="500"
        fontFamily="system-ui, sans-serif"
      >
        FIT
      </text>

      {/* Magnifying glass hint */}
      <g transform="translate(118 148)">
        <circle cx="14" cy="14" r="11" stroke="#94a3b8" strokeWidth="2" opacity="0.45" />
        <path
          d="M22 22 L30 30"
          stroke="#94a3b8"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
    </svg>
  );
}
