import type { MediaListResponse } from "@/types/social";
import { MetricValue, formatDate, mediaTypeLabel } from "./social-ui";

type Item = MediaListResponse["items"][number];

export function ContentCard({
  item,
  onView,
}: {
  item: Item;
  onView: (id: string) => void;
}) {
  const { media, performance } = item;
  const thumb = media.thumbnailUrl ?? media.mediaUrl;
  const metrics = performance?.raw ?? {};

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative aspect-square w-full bg-gray-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No preview
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {mediaTypeLabel(media.mediaType, media.mediaProductType)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[11px] text-mm-muted">{formatDate(media.timestamp)}</p>
        <p className="mt-1 line-clamp-2 text-xs text-mm-ink">
          {media.caption?.trim() || <span className="italic text-gray-400">No caption</span>}
        </p>

        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
          <div>
            <span className="block text-[9px] uppercase text-mm-muted">Views</span>
            <MetricValue value={metrics.views ?? null} />
          </div>
          <div>
            <span className="block text-[9px] uppercase text-mm-muted">Reach</span>
            <MetricValue value={metrics.reach ?? null} />
          </div>
          <div>
            <span className="block text-[9px] uppercase text-mm-muted">Int. rate</span>
            <MetricValue value={performance?.interactionRate ?? null} format="percent" />
          </div>
        </div>

        {media.creative && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[media.creative.creativeType, media.creative.hookType, media.creative.primaryEmotion]
              .filter((v) => v && v !== "Unknown" && v !== "Not detected")
              .slice(0, 3)
              .map((v, i) => (
                <span
                  // Index-qualified: creativeType and hookType can both legitimately
                  // be "POV" on the same post, so the value alone isn't a unique key.
                  key={`${v}-${i}`}
                  className="rounded-full bg-mm-lavender/60 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"
                >
                  {v}
                </span>
              ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => onView(media.id)}
            className="rounded-full bg-mm-ink px-3 py-1 text-[11px] font-semibold text-white"
          >
            View Analysis
          </button>
          {media.permalink && (
            <a
              href={media.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-mm-dark-rose underline underline-offset-2"
            >
              Open on Instagram
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
