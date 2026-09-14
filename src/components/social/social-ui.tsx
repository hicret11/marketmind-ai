import type { InstagramMediaProductType, InstagramMediaType } from "@/types/social";

/**
 * Deterministic, locale-independent number formatting.
 *
 * Never relies on the runtime's default locale — plain `toLocaleString()`
 * silently swaps "," and "." for thousands/decimal separators depending on
 * the server/browser's OS locale, which is what produced inconsistent,
 * confusing values like "160,579" or "123,5" in different environments.
 *
 * Large counts (views, reach, ...) are abbreviated (160579 -> "160.6K") for
 * scannability; smaller numbers and non-integer averages show their full
 * value with at most one decimal place ("123.5"). The exact figure is always
 * available on hover via the `title` attribute — "full numbers where
 * appropriate" without cluttering the compact display.
 */
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Exact value, pinned to en-US grouping — for the title/tooltip, never locale-dependent. */
export function formatExactNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** A metric that renders its real value or an explicit "Not available" — never 0-as-missing. */
export function MetricValue({
  value,
  format = "number",
  suffix = "",
}: {
  value: number | null | undefined;
  format?: "number" | "percent";
  suffix?: string;
}) {
  if (value === null || value === undefined) {
    return <span className="italic text-gray-400">Not available</span>;
  }
  if (format === "percent") {
    return (
      <span className="tabular-nums text-mm-ink">
        {(value * 100).toFixed(2)}%{suffix}
      </span>
    );
  }
  return (
    <span className="tabular-nums text-mm-ink" title={formatExactNumber(value)}>
      {formatCompactNumber(value)}
      {suffix}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  format,
}: {
  label: string;
  value: number | null | undefined;
  format?: "number" | "percent";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        <MetricValue value={value} format={format} />
      </p>
    </div>
  );
}

export function mediaTypeLabel(
  mediaType: InstagramMediaType,
  productType: InstagramMediaProductType,
): string {
  if (productType === "REELS") return "Reel";
  if (productType === "STORY") return "Story";
  if (mediaType === "CAROUSEL_ALBUM") return "Carousel";
  if (mediaType === "IMAGE") return "Image";
  if (mediaType === "VIDEO") return "Video";
  return "Post";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Maps the OAuth callback's `ig_error` query param to an understandable message. */
export function instagramOAuthErrorMessage(code: string, detail: string | null, username: string | null): string {
  switch (code) {
    case "denied":
      return detail
        ? `Instagram authorization was declined: ${detail}`
        : "Instagram authorization was declined. You can connect again anytime.";
    case "invalid_callback":
      return "Instagram didn't return the expected information. Please try connecting again.";
    case "state_mismatch":
      return "That connection attempt expired or was invalid. Please try connecting again.";
    case "account_type":
      return username
        ? `@${username} is a personal Instagram account. MarketMind requires a Business or Creator account — switch account type in the Instagram app, then reconnect.`
        : "MarketMind requires an Instagram Business or Creator account. Switch account type in the Instagram app, then reconnect.";
    case "oauth_failed":
      return "The Instagram connection didn't complete. Please try again.";
    default:
      return "The Instagram connection didn't complete. Please try again.";
  }
}

/** Small header used across the split "Instagram data vs MarketMind AI" sections. */
export function SourceLabel({ source }: { source: "instagram" | "marketmind" }) {
  return source === "instagram" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-mm-soft-pink/60 px-1.5 py-0.5 text-[11px] font-semibold text-mm-dark-rose">
      Instagram Data
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-mm-lavender px-1.5 py-0.5 text-[11px] font-semibold text-purple-700">
      MarketMind AI Analysis
    </span>
  );
}
