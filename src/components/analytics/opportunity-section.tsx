import Link from "next/link";
import type { OpportunityIntelligenceSummary } from "@/types/analytics";
import { MiniBarList, SectionCard, StatTile } from "./analytics-ui";

export function OpportunityIntelligenceSection({ data }: { data: OpportunityIntelligenceSummary }) {
  if (data.totalReviewed === 0) {
    return (
      <SectionCard title="Opportunity Intelligence" subtitle="Real Opportunity Discovery businesses reviewed in the Evaluation Lab.">
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-mm-muted">
          No opportunities reviewed yet — use &quot;Add to Evaluation Dataset&quot; or &quot;Build Evaluation Dataset&quot; from Opportunity Discovery.
        </p>
      </SectionCard>
    );
  }

  const verified = data.strong + data.potential + data.weak + data.notRelevant;

  return (
    <SectionCard
      title="Opportunity Intelligence"
      subtitle={`${data.totalReviewed} business(es) reviewed · ${verified} Human Verified · ${data.needsReview} needs review.`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Strong" value={data.strong} />
          <StatTile label="Potential" value={data.potential} />
          <StatTile label="Weak" value={data.weak} />
          <StatTile label="Not Relevant" value={data.notRelevant} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">By category</p>
            <MiniBarList items={data.byCategory} total={data.totalReviewed} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">By opportunity score range</p>
            <MiniBarList items={data.byScoreRange} total={data.totalReviewed} />
          </div>
        </div>

        {data.topCategory ? (
          <p className="rounded-lg border border-mm-rose/30 bg-mm-soft-pink/20 p-3 text-xs text-mm-ink">
            Highest-quality category so far: <strong>{data.topCategory.label}</strong> —{" "}
            {Math.round(data.topCategory.qualifiedRate * 100)}% qualified across {data.topCategory.verifiedCount} Human
            Verified case(s).
          </p>
        ) : (
          <p className="text-[11px] text-mm-muted">Not enough Human Verified cases per category yet to rank category quality.</p>
        )}

        {!data.locationBreakdownAvailable && (
          <p className="text-[11px] text-mm-muted">
            Location breakdown not available — Opportunity Discovery evidence doesn&apos;t record structured city/region
            for these businesses yet.
          </p>
        )}

        <Link href="/evaluation/lead-qualification" className="text-xs text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2">
          Open Lead Qualification Benchmark →
        </Link>
      </div>
    </SectionCard>
  );
}
