import { cn } from "@/lib/utils";

const PRIMARY = "#0475ef";
const EMERALD = "#34d399";
const PAPER = "#ffffff";
const INK = "#061420";
const MUTED = "#64748b";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function MiniScoreCard({
  x,
  y,
  label,
  score,
  fill,
}: {
  x: number;
  y: number;
  label: string;
  score: number;
  fill: string;
}) {
  const barWidth = 42 * (score / 100);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="74" height="34" rx="8" fill={INK} fillOpacity="0.42" />
      <rect
        width="74"
        height="34"
        rx="8"
        stroke={PAPER}
        strokeOpacity="0.08"
        strokeWidth="1"
      />
      <text
        x="8"
        y="12"
        fill={MUTED}
        fontSize="7"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.04em"
      >
        {label}
      </text>
      <rect x="8" y="18" width="42" height="3" rx="1.5" fill={PAPER} fillOpacity="0.1" />
      <rect x="8" y="18" width={barWidth} height="3" rx="1.5" fill={fill} />
      <text
        x="66"
        y="27"
        textAnchor="end"
        fill={PAPER}
        fontSize="10"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {score}
      </text>
    </g>
  );
}

/** Score tab intro — master gauge plus category score cards. */
export function ResumeScoreIntroIllustration({ className }: { className?: string }) {
  const gaugeScore = 82;
  const scoreAngle = 180 + (gaugeScore / 100) * 180;

  return (
    <svg
      viewBox="0 0 200 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="72" ry="14" fill={PRIMARY} fillOpacity="0.04" />

      <path
        d={arcPath(100, 78, 58, 180, 360)}
        stroke={PAPER}
        strokeOpacity="0.12"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={arcPath(100, 78, 58, 180, scoreAngle)}
        stroke={PRIMARY}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={arcPath(100, 78, 58, 180, scoreAngle)}
        stroke={PAPER}
        strokeOpacity="0.22"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <circle cx="100" cy="78" r="34" fill={INK} fillOpacity="0.55" />
      <circle cx="100" cy="78" r="34" stroke={PAPER} strokeOpacity="0.08" strokeWidth="1" />
      <text
        x="100"
        y="84"
        textAnchor="middle"
        fill={PAPER}
        fontSize="24"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {gaugeScore}
      </text>

      <MiniScoreCard x={22} y={98} label="CONTENT" score={88} fill={EMERALD} />
      <MiniScoreCard x={104} y={98} label="STRUCTURE" score={85} fill={PRIMARY} />

      <circle cx="168" cy="34" r="2.2" fill={PRIMARY} fillOpacity="0.45" />
      <circle cx="28" cy="52" r="1.8" fill={EMERALD} fillOpacity="0.4" />
    </svg>
  );
}
