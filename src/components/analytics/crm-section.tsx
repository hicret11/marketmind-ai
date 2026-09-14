import Link from "next/link";
import type { CrmPerformanceSummary } from "@/types/analytics";
import { MetricValue, MiniBarList, SectionCard } from "./analytics-ui";

export function CrmPerformanceSection({ data }: { data: CrmPerformanceSummary }) {
  if (data.totalLeads === 0) {
    return (
      <SectionCard title="Lead & CRM Performance" subtitle="Real CRM data — leads you've approved or imported.">
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-mm-muted">
          No CRM leads yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Lead & CRM Performance" subtitle={`${data.totalLeads} total lead(s) · ${data.leadsInRange} in the selected range.`}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">Funnel</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-mm-muted">
                  <th className="py-1 pr-3">Stage</th>
                  <th className="py-1 pr-3">Leads at or past this stage</th>
                  <th className="py-1">Conversion from previous</th>
                </tr>
              </thead>
              <tbody>
                {data.funnel.map((stage) => (
                  <tr key={stage.status} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-mm-ink">{stage.label}</td>
                    <td className="py-1.5 pr-3">{stage.count}</td>
                    <td className="py-1.5">
                      <MetricValue value={stage.conversionFromPrevious} format="percent" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">By region</p>
            <MiniBarList items={data.byRegion} total={data.totalLeads} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">By category</p>
            <MiniBarList items={data.byCategory} total={data.totalLeads} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">By source</p>
            <MiniBarList items={data.bySource} total={data.totalLeads} />
          </div>
        </div>

        <Link href="/crm" className="text-xs text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
          Open CRM →
        </Link>
      </div>
    </SectionCard>
  );
}
