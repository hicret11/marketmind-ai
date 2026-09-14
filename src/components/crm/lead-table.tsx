import type { CrmLead } from "@/types/crm";
import { formatCrmDate, orNotAvailable, StatusBadge } from "./crm-ui";

export function LeadTable({ leads, onSelect }: { leads: CrmLead[]; onSelect: (lead: CrmLead) => void }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-mm-muted">
        No leads match these filters yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-mm-muted">
            <th className="px-3 py-2">Business</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Contact</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Last Contact</th>
            <th className="px-3 py-2">Next Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onSelect(lead)}
              className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-mm-soft-pink/10"
            >
              <td className="px-3 py-2">
                <p className="font-medium text-mm-ink">{lead.businessName}</p>
                {lead.website && <p className="text-[10px] text-mm-muted">{lead.website}</p>}
              </td>
              <td className="px-3 py-2 text-mm-muted">
                {[lead.city, lead.region].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-3 py-2 text-mm-muted">{lead.category ?? "—"}</td>
              <td className="px-3 py-2">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-3 py-2 text-mm-muted">
                {lead.contactPerson ? (
                  <>
                    {lead.contactPerson}
                    {lead.contactRole ? ` (${lead.contactRole})` : ""}
                  </>
                ) : (
                  orNotAvailable(lead.email)
                )}
              </td>
              <td className="px-3 py-2 text-mm-muted">{lead.source}</td>
              <td className="px-3 py-2 text-mm-muted">{formatCrmDate(lead.lastContactedAt)}</td>
              <td className="px-3 py-2 text-mm-muted">{formatCrmDate(lead.nextFollowUpAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
