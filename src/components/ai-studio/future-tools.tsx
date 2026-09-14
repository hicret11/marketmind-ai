interface FutureTool {
  icon: string;
  title: string;
  description: string;
}

const FUTURE_TOOLS: FutureTool[] = [
  { icon: "🎙️", title: "Voice Generator", description: "Turn text into personalized birthday voice messages." },
  { icon: "🎬", title: "Video Generator", description: "Create short personalized birthday video clips." },
  { icon: "🔍", title: "SEO Keyword Generator", description: "Find keywords to grow organic birthday-gift search traffic." },
  { icon: "📱", title: "Social Caption Generator", description: "Draft on-brand captions for your synced content." },
  { icon: "📣", title: "Ad Copy Generator", description: "Generate headline and copy variations for campaigns." },
  { icon: "🏷️", title: "Product Description Generator", description: "Write product copy for new gift bundles." },
  { icon: "📝", title: "Blog Outline Generator", description: "Plan blog content around birthday gifting topics." },
  { icon: "🖥️", title: "Landing Page Copy Generator", description: "Draft copy for new campaign landing pages." },
  { icon: "🎥", title: "UGC Script Generator", description: "Write scripts for creator/UGC-style birthday videos." },
];

/** Product-roadmap placeholders only — none of these are wired to any logic. */
export function FutureTools() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-mm-ink">Future Tools</h2>
      <p className="mt-0.5 text-xs text-mm-muted">More AI creation tools are on the way.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FUTURE_TOOLS.map((tool) => (
          <div key={tool.title} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xl" aria-hidden>
                {tool.icon}
              </span>
              <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                Coming Soon
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-mm-ink">{tool.title}</p>
            <p className="mt-0.5 text-[11px] text-mm-muted">{tool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
