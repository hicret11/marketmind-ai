import { getHandbookCategories, loadHandbookSections } from "@/lib/handbook/loader";
import { HandbookShell } from "@/components/handbook/handbook-shell";

export default function HandbookPage() {
  const sections = loadHandbookSections();
  const categories = getHandbookCategories();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-mm-ink">Digital Marketing Handbook</h1>
        <p className="mt-1 text-sm text-mm-muted">
          A practical reference library — from fundamentals to channel playbooks
          — that MarketMind Chat also draws on when it answers your questions.
        </p>
      </header>

      <HandbookShell categories={categories} sections={sections} />
    </div>
  );
}
