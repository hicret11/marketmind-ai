import { CRM_STATUS_LABELS, type CrmLeadStatus } from "@/types/crm";

/** Pinned "en-US" — never the runtime's default locale (see Social Analytics' number-formatting fix). */
export function formatCrmDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Missing contact fields are always shown as "Not available" — never blank, never invented. */
export function orNotAvailable(value: string | null | undefined): string {
  return value && value.trim() ? value : "Not available";
}

const STATUS_STYLES: Record<CrmLeadStatus, string> = {
  approved: "bg-blue-100 text-blue-800",
  to_contact: "bg-amber-100 text-amber-800",
  contacted: "bg-purple-100 text-purple-800",
  replied: "bg-indigo-100 text-indigo-800",
  meeting: "bg-mm-lavender text-purple-800",
  interested: "bg-mm-soft-pink text-mm-dark-rose",
  converted: "bg-green-100 text-green-800",
  not_interested: "bg-gray-100 text-gray-500",
  no_response: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: CrmLeadStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
      {CRM_STATUS_LABELS[status]}
    </span>
  );
}
