import type { FitBand } from "@/types/opportunity";

const R = 26;
const C = 2 * Math.PI * R;

export function FitScoreDial({
  score,
  band,
  size = 72,
}: {
  score: number;
  band: FitBand;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = C * pct;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Sing My Birthday fit score ${score} of 100, ${band} fit`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="mmFitDial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E84C9D" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={R} fill="none" stroke="#F3E8FF" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="url(#mmFitDial)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none text-mm-ink">
          {score}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-mm-muted">
          / 100
        </span>
      </div>
    </div>
  );
}
