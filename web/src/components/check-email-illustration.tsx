import { cn } from "@/lib/utils";

/** Sign-up confirmation hero — inbox / magic-link email. */
export function CheckEmailIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      {/* Soft glow */}
      <ellipse cx="140" cy="108" rx="92" ry="56" fill="#0475ef" fillOpacity="0.08" />

      {/* Inbox tray */}
      <path
        d="M52 128 H228 V156 C228 164 221 170 213 170 H67 C59 170 52 164 52 156 V128 Z"
        fill="#061420"
        stroke="#243044"
        strokeWidth="1.5"
      />
      <path
        d="M52 128 L140 92 L228 128"
        stroke="#243044"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Envelope */}
      <g transform="translate(78 44)">
        <rect
          x="0"
          y="18"
          width="124"
          height="82"
          rx="12"
          fill="#061420"
          stroke="#243044"
          strokeWidth="1.5"
        />
        <path
          d="M0 36 L62 78 L124 36"
          stroke="#0475ef"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <path
          d="M0 36 L62 58 L124 36"
          fill="#0475ef"
          fillOpacity="0.12"
        />
        <rect x="18" y="52" width="56" height="5" rx="2.5" fill="#243044" />
        <rect x="18" y="64" width="44" height="4" rx="2" fill="#243044" />
        <rect x="18" y="74" width="36" height="4" rx="2" fill="#243044" />

        {/* Magic link chip */}
        <rect x="66" y="62" width="40" height="18" rx="6" fill="#0475ef" fillOpacity="0.2" />
        <rect x="72" y="69" width="22" height="4" rx="2" fill="#0475ef" />
      </g>

      {/* Notification badge */}
      <circle cx="196" cy="58" r="18" fill="#000610" stroke="#0475ef" strokeWidth="2.5" />
      <circle cx="196" cy="58" r="12" fill="#0475ef" fillOpacity="0.18" />
      <path
        d="M189 58 L194 63 L204 52"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Incoming message spark */}
      <g transform="translate(34 72)" opacity="0.75">
        <path
          d="M0 8 L12 0 L10 8 L18 10 L6 18 L8 10 Z"
          fill="#0475ef"
          fillOpacity="0.55"
        />
      </g>
      <g transform="translate(228 88)" opacity="0.45">
        <path
          d="M0 6 L9 0 L7.5 6 L12 7.5 L4.5 12 L6 7.5 Z"
          fill="#0475ef"
          fillOpacity="0.45"
        />
      </g>
    </svg>
  );
}
