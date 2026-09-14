import { formatCompactNumber, formatDate } from "./social-ui";
import type { UnifiedContentItem } from "@/types/unified-content";

const PLATFORM_LABEL: Record<UnifiedContentItem["platform"], string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const PLATFORM_BADGE: Record<UnifiedContentItem["platform"], string> = {
  instagram: "bg-mm-lavender/40 text-mm-dark-rose",
  youtube: "bg-red-50 text-red-700",
  tiktok: "bg-gray-100 text-gray-800",
};

/** Cross-platform content card — used by the "All" tab and the YouTube/TikTok tabs. */
export function UnifiedContentCard({ item }: { item: UnifiedContentItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative aspect-square bg-gray-100">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No thumbnail</div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_BADGE[item.platform]}`}
        >
          {PLATFORM_LABEL[item.platform]} · {item.contentType}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs text-mm-ink" title={item.title ?? ""}>
          {item.title?.trim() || <span className="italic text-gray-400">No title/caption</span>}
        </p>
        <p className="mt-1 text-[11px] text-mm-muted">{item.publishedAt ? formatDate(item.publishedAt) : "Date unknown"}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-mm-muted">
          <Metric label="Views" value={item.metrics.views} />
          <Metric label="Likes" value={item.metrics.likes} />
          <Metric label="Comments" value={item.metrics.comments} />
          <Metric label="Shares" value={item.metrics.shares} />
          <Metric label="Saves" value={item.metrics.saves} />
        </div>
        {item.permalink && (
          <a
            href={item.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[11px] font-medium text-mm-dark-rose underline underline-offset-2"
          >
            Open
          </a>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <span>
      {label}: <span className="font-medium text-mm-ink">{formatCompactNumber(value)}</span>
    </span>
  );
}
