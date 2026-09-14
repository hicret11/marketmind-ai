import { SectionCard, StatTile, MiniBarList } from "@/components/analytics/analytics-ui";
import { formatCompactNumber } from "@/components/social/social-ui";
import { ExampleDataBadge } from "./example-badge";
import { TrendChart } from "./trend-chart";
import { DecisionInsightCard } from "./decision-insight-card";
import { getExampleDashboard } from "@/lib/data-insights/example-data";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function money(v: number): string {
  return `$${formatCompactNumber(v)}`;
}

/** The full example dashboard — fictional data only, always shown behind the EXAMPLE DATA badge. */
export function ExampleDashboard() {
  const d = getExampleDashboard();

  return (
    <div className="space-y-6">
      <ExampleDataBadge />

      <SectionCard title="Business Overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Revenue" value={money(d.overview.revenue)} />
          <StatTile label="Orders" value={formatCompactNumber(d.overview.orders)} />
          <StatTile label="Customers" value={formatCompactNumber(d.overview.customers)} />
          <StatTile label="Conversion Rate" value={pct(d.overview.conversionRate)} />
          <StatTile label="Avg Order Value" value={money(d.overview.averageOrderValue)} />
          <StatTile label="Repeat Customers" value={pct(d.overview.repeatCustomerRate)} />
        </div>
      </SectionCard>

      <SectionCard title="Trends" subtitle="Last 5 weeks">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">Revenue over time</p>
            <TrendChart points={d.trends.revenue} formatValue={money} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">Orders over time</p>
            <TrendChart points={d.trends.orders} color="#8B5CF6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">Customer growth</p>
            <TrendChart points={d.trends.customerGrowth} color="#0EA5E9" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">Conversion trend</p>
            <TrendChart points={d.trends.conversionRate} formatValue={pct} color="#F59E0B" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Customer Insights">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">New vs Returning</p>
            <MiniBarList
              items={[
                { label: "New customers", count: d.customers.newVsReturning.newCustomers },
                { label: "Returning customers", count: d.customers.newVsReturning.returningCustomers },
              ]}
              total={d.customers.newVsReturning.newCustomers + d.customers.newVsReturning.returningCustomers}
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mm-ink">Top customer segments</p>
            <MiniBarList
              items={d.customers.topSegments.map((s) => ({ label: s.label, count: s.customers }))}
              total={d.customers.topSegments.reduce((sum, s) => sum + s.customers, 0)}
            />
          </div>
          <StatTile label="Repeat purchase rate" value={pct(d.customers.repeatPurchaseRate)} />
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Avg value — new" value={money(d.customers.averageCustomerValue.newCustomers)} />
            <StatTile label="Avg value — returning" value={money(d.customers.averageCustomerValue.returningCustomers)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Product Insights">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProductTable title="Best-performing products" rows={d.products.best} />
          <ProductTable title="Low-performing products" rows={d.products.worst} />
        </div>
      </SectionCard>

      <SectionCard title="Marketing Attribution">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-mm-muted">
                <th className="py-1 pr-3">Source</th>
                <th className="py-1 pr-3">Revenue</th>
                <th className="py-1 pr-3">Customers</th>
                <th className="py-1">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {d.attribution.map((row) => (
                <tr key={row.source} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-medium text-mm-ink">{row.source}</td>
                  <td className="py-1.5 pr-3">{money(row.revenue)}</td>
                  <td className="py-1.5 pr-3">{formatCompactNumber(row.customers)}</td>
                  <td className="py-1.5">{pct(row.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Decision Insights" subtitle="Evidence-backed findings from the example data above.">
        <div className="space-y-3">
          {d.decisionInsights.map((insight, i) => (
            <DecisionInsightCard key={i} insight={insight} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ProductTable({ title, rows }: { title: string; rows: Array<{ name: string; revenue: number; conversionRate: number }> }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-mm-ink">{title}</p>
      <table className="mt-1.5 w-full text-left text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-gray-100">
              <td className="max-w-[160px] truncate py-1.5 pr-2 text-mm-ink" title={r.name}>
                {r.name}
              </td>
              <td className="py-1.5 pr-2">{money(r.revenue)}</td>
              <td className="py-1.5">{pct(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
