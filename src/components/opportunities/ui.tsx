import type { FitBand, SignalStatus } from "@/types/opportunity";

export const BAND_STYLES: Record<FitBand, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  low: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

export function BandBadge({ band }: { band: FitBand }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${BAND_STYLES[band]}`}
    >
      {band} fit
    </span>
  );
}

const SIGNAL_STYLES: Record<
  SignalStatus,
  { label: string; className: string; dot: string }
> = {
  detected: {
    label: "Detected",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  not_detected: {
    label: "Not detected",
    className: "bg-gray-100 text-gray-500 ring-gray-500/20",
    dot: "bg-gray-400",
  },
  unknown: {
    label: "Unknown",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

export function SignalBadge({ status }: { status: SignalStatus }) {
  const s = SIGNAL_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function VerifiedTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-mm-soft-pink/60 px-1.5 py-0.5 text-[11px] font-medium text-mm-dark-rose">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mm-muted">
      {children}
    </p>
  );
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}
