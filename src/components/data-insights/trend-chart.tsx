import type { ExampleTrendPoint } from "@/types/data-insights";

/**
 * A deliberately simple line chart — plain inline SVG, no charting library
 * — matching the "avoid a complicated BI tool" design goal. Works for any
 * metric's real OR example points, as long as they're already aggregated.
 */
export function TrendChart({
  points,
  formatValue,
  color = "#E8508C",
}: {
  points: ExampleTrendPoint[];
  formatValue?: (v: number) => string;
  color?: string;
}) {
  if (points.length === 0) return <p className="text-xs text-mm-muted">No data yet.</p>;

  const width = 280;
  const height = 72;
  const padding = 6;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
    return { x, y, value: p.value };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const fmt = formatValue ?? ((v: number) => String(v));
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-mm-muted">
        <span>{points[0].label}</span>
        <span className="font-semibold text-mm-ink">
          {last.label}: {fmt(last.value)}
        </span>
      </div>
    </div>
  );
}
