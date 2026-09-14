export { MetricValue, formatCompactNumber } from "@/components/social/social-ui";

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-mm-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-mm-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
      <p className="text-lg font-semibold text-mm-ink">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-mm-muted">{label}</p>
    </div>
  );
}

export function MiniBarList({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (items.length === 0) return <p className="text-xs text-mm-muted">No data yet.</p>;
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 8).map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[11px] text-mm-muted">
          <span className="w-28 shrink-0 truncate">{item.label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <span
              className="block h-full rounded-full bg-mm-rose"
              style={{ width: `${total > 0 ? Math.round((item.count / total) * 100) : 0}%` }}
            />
          </span>
          <span className="w-6 shrink-0 text-right">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function NotConnected({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-mm-muted">
      {label} isn&apos;t connected yet — no data to show.
    </div>
  );
}
