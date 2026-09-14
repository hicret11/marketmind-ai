const PROMPTS = [
  "Build a marketing strategy for Sing My Birthday",
  "What should I focus on this month?",
  "Explain lead generation to me",
  "Give me a Meta Ads testing strategy",
  "What have I learned from my previous marketing notes?",
  "Help me create a B2B outreach strategy",
  "What KPIs should I track?",
  "Give me content ideas based on my product",
];

export function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-xl">
        🧠
      </div>
      <h2 className="text-lg font-semibold text-mm-ink">
        How can MarketMind help today?
      </h2>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-mm-ink transition-colors hover:border-mm-rose hover:bg-mm-soft-pink/30"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
