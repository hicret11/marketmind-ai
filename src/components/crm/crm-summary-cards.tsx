const CARDS: { label: string; statuses: string[] }[] = [
  { label: "Total approved leads", statuses: ["approved"] },
  { label: "To Contact", statuses: ["to_contact"] },
  { label: "Contacted", statuses: ["contacted"] },
  { label: "Replied", statuses: ["replied"] },
  { label: "Meetings", statuses: ["meeting"] },
  { label: "Converted", statuses: ["converted"] },
];

/** Real counts only — computed from the actual CRM lead list, never fabricated. */
export function CrmSummaryCards({ byStatus }: { byStatus: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => {
        const value = c.statuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
        return (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-semibold text-mm-ink">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}
