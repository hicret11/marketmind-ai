"use client";

import { useEffect, useState } from "react";
import { AddCompanyModal } from "@/components/company/add-company-modal";
import { ApiError, fetchCompanies } from "@/lib/company/client";
import type { CompanyProfile } from "@/types/company";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-mm-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-mm-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-mm-soft-pink/60 px-2.5 py-1 text-xs font-medium text-mm-dark-rose"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function CompanyPage() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [active, setActive] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    fetchCompanies()
      .then((res) => {
        setCompanies(res.companies);
        setActive(res.active);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load company data."));
  }

  useEffect(load, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-xl">🏢</span>
            <h1 className="text-2xl font-semibold text-mm-ink">Company</h1>
          </div>
          <p className="mt-1 text-sm text-mm-muted">
            The business context MarketMind reasons about across Chat, Opportunity Discovery and Social
            Analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-full bg-mm-pink px-4 py-2 text-sm font-semibold text-white"
        >
          + Add Company
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {companies.length > 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-mm-muted">
          {companies.length} companies in MarketMind. Only one is active at a time — the active company is
          shown below.
        </div>
      )}

      {!active ? (
        !error && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
            Loading company profile…
          </div>
        )
      ) : (
        <>
          <div className="rounded-xl border border-mm-rose/40 bg-mm-soft-pink/20 p-5">
            <span className="rounded-full bg-mm-pink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Active company
            </span>
            <h2 className="mt-2 text-xl font-semibold text-mm-ink">{active.name}</h2>
            {active.website && (
              <a
                href={active.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-mm-dark-rose underline decoration-mm-rose/50 underline-offset-2"
              >
                {active.website}
              </a>
            )}
            {active.companyType && <p className="mt-1 text-sm text-mm-muted">{active.companyType}</p>}
          </div>

          <Section title="Company Overview">
            <p className="text-sm text-mm-ink">
              {active.description || <span className="text-mm-muted">No description yet.</span>}
            </p>
          </Section>

          <Section title="Product">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mm-muted">Main use cases</p>
            <TagList items={active.useCases} empty="No use cases added yet." />
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-mm-muted">
              Main product strengths
            </p>
            <TagList items={active.productStrengths} empty="No product strengths added yet." />
          </Section>

          <Section title="Target Audience">
            <TagList items={active.targetAudience} empty="No target audience added yet." />
          </Section>

          <Section title="B2B Opportunity Profile">
            <p className="text-sm text-mm-ink">
              Business model: {active.businessModel || <span className="text-mm-muted">Not set.</span>}
            </p>
            <p className="mb-2 mt-3 text-xs font-medium uppercase tracking-wide text-mm-muted">
              Primary B2B target categories
            </p>
            <TagList items={active.b2bTargetCategories} empty="No B2B target categories added yet." />
          </Section>

          <Section title="Brand Voice">
            <p className="text-sm text-mm-ink">
              {active.brandPositioning || <span className="text-mm-muted">No brand positioning notes yet.</span>}
            </p>
            {active.brandFocusThemes.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-xs font-medium uppercase tracking-wide text-mm-muted">
                  Focus on
                </p>
                <TagList items={active.brandFocusThemes} empty="" />
              </>
            )}
          </Section>

          <Section title="Marketing Goals">
            <TagList items={active.marketingGoals} empty="No marketing goals set yet." />
          </Section>

          <Section title="Current Technology / Integrations">
            <TagList items={active.integrations} empty="No integrations listed yet." />
          </Section>

          {active.notes && (
            <Section title="Notes">
              <p className="whitespace-pre-wrap text-sm text-mm-ink">{active.notes}</p>
            </Section>
          )}
        </>
      )}

      {showAdd && (
        <AddCompanyModal
          onClose={() => setShowAdd(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}
