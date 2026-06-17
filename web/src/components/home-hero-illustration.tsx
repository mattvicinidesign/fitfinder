import { cn } from "@/lib/utils";

/** Home hero — person at desk reviewing fit reports. */
export function HomeHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 156 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      {/* Fit report card — upper left anchor */}
      <rect
        x="4"
        y="6"
        width="50"
        height="40"
        rx="7"
        fill="#061420"
        fillOpacity="0.38"
      />
      <rect x="11" y="14" width="24" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.65" />
      <rect x="11" y="21" width="34" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.4" />
      <rect x="11" y="28" width="20" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.4" />
      <rect x="11" y="35" width="28" height="3" rx="1.5" fill="#34d399" fillOpacity="0.85" />

      {/* Score badge — upper right counterweight */}
      <circle cx="132" cy="22" r="16" fill="#061420" fillOpacity="0.32" />
      <circle cx="132" cy="22" r="11" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.9" />
      <text
        x="132"
        y="26"
        textAnchor="middle"
        fill="#ffffff"
        fillOpacity="0.92"
        fontSize="10"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        9
      </text>

      {/* Desk */}
      <rect x="28" y="104" width="112" height="7" rx="2" fill="#ffffff" fillOpacity="0.92" />
      <rect x="28" y="111" width="5" height="24" rx="1" fill="#ffffff" fillOpacity="0.72" />
      <rect x="135" y="111" width="5" height="24" rx="1" fill="#ffffff" fillOpacity="0.72" />

      {/* Laptop */}
      <rect x="68" y="90" width="42" height="15" rx="2" fill="#061420" />
      <rect x="72" y="93" width="34" height="9" rx="1" fill="#243044" />
      <path d="M64 105 H114 L110 109 H68 Z" fill="#061420" />

      {/* Chair */}
      <rect x="82" y="78" width="18" height="16" rx="4" fill="#061420" fillOpacity="0.45" />

      {/* Person — light shirt reads on primary blue */}
      <circle cx="91" cy="52" r="13" fill="#f4c4a0" />
      <path
        d="M78 52 C78 42.5 83.5 37 91 37 C98.5 37 104 42.5 104 52"
        fill="#1a1f2e"
      />
      <path
        d="M74 76 C76.5 66 82 62 91 62 C100 62 105.5 66 108 76 L108 104 L74 104 Z"
        fill="#ffffff"
        fillOpacity="0.95"
      />
      <path
        d="M74 104 L74 116 L83 116 L83 104 Z"
        fill="#061420"
        fillOpacity="0.85"
      />
      <path
        d="M99 104 L99 116 L108 116 L108 104 Z"
        fill="#061420"
        fillOpacity="0.85"
      />

      {/* Arms */}
      <path d="M74 78 L64 96 L68 98 L78 82 Z" fill="#ffffff" fillOpacity="0.95" />
      <path d="M108 78 L118 96 L114 98 L104 82 Z" fill="#ffffff" fillOpacity="0.95" />

      {/* Plant */}
      <rect x="18" y="116" width="13" height="11" rx="3" fill="#ffffff" fillOpacity="0.85" />
      <circle cx="22" cy="112" r="4.5" fill="#34d399" />
      <circle cx="28" cy="108" r="4.5" fill="#34d399" />
      <circle cx="16" cy="108" r="3.5" fill="#34d399" />
    </svg>
  );
}
