/** Shown at the top of Example Mode — this data is fictional and must never be confused with real MarketMind data. */
export function ExampleDataBadge() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Example Data
      </span>
      <p className="text-xs text-amber-900">
        Fictional demo numbers — not from your real business. Connect a database to see real Data Insights.
      </p>
    </div>
  );
}
