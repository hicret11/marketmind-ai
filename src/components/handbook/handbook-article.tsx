import { parseHandbookMarkdown, type HandbookBlock, type CalloutKind } from "@/lib/handbook/markdown";
import type { HandbookSection } from "@/lib/handbook/types";

const CALLOUT_STYLES: Record<CalloutKind, { label: string; icon: string; className: string }> = {
  "key-idea": {
    label: "Key Idea",
    icon: "💡",
    className: "border-mm-rose/50 bg-mm-soft-pink/40 text-mm-ink",
  },
  example: {
    label: "Example",
    icon: "🔎",
    className: "border-purple-200 bg-mm-lavender/50 text-mm-ink",
  },
  mistake: {
    label: "Common Mistake",
    icon: "⚠️",
    className: "border-amber-200 bg-amber-50 text-mm-ink",
  },
  metric: {
    label: "Metric",
    icon: "📊",
    className: "border-emerald-200 bg-emerald-50 text-mm-ink",
  },
};

/** Minimal inline **bold** support without a markdown dependency. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function Block({ block, index }: { block: HandbookBlock; index: number }) {
  const key = `block-${index}`;

  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 key={key} className="mt-6 text-lg font-semibold text-mm-ink first:mt-0">
          {renderInline(block.text, key)}
        </h2>
      ) : (
        <h3 key={key} className="mt-4 text-base font-semibold text-mm-ink">
          {renderInline(block.text, key)}
        </h3>
      );
    case "paragraph":
      return (
        <p key={key} className="mt-2 text-[15px] leading-relaxed text-mm-ink">
          {renderInline(block.text, key)}
        </p>
      );
    case "bullet-list":
      return (
        <ul key={key} className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-mm-ink">
          {block.items.map((item, i) => (
            <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ul>
      );
    case "number-list":
      return (
        <ol key={key} className="mt-2 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-mm-ink">
          {block.items.map((item, i) => (
            <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ol>
      );
    case "callout": {
      const style = CALLOUT_STYLES[block.kind];
      return (
        <div key={key} className={`mt-4 rounded-xl border p-4 text-sm ${style.className}`}>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
            <span aria-hidden>{style.icon}</span>
            {style.label}
          </p>
          <p className="leading-relaxed">{renderInline(block.text, key)}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export function HandbookArticle({ section }: { section: HandbookSection }) {
  const blocks = parseHandbookMarkdown(section.content);
  return (
    <article>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-pink">
        {section.category}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-mm-ink">{section.title}</h1>
      {section.description && (
        <p className="mt-2 text-sm text-mm-muted">{section.description}</p>
      )}
      {section.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {section.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-gray-100 pt-5">
        {blocks.map((block, i) => (
          <Block key={i} block={block} index={i} />
        ))}
      </div>
    </article>
  );
}
