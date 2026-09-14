import { findDuplicate } from "./dedupe";
import { createLead, listLeads, updateLead, addActivity } from "./repository";
import type { ImportCommitRequest } from "./validate";
import { canonicalizeUrl } from "@/lib/opportunity/util";
import type { CsvImportResult } from "@/types/crm";

/**
 * Commits a previewed CSV import. Each row carries the user's decision:
 *  - "import": create a new lead regardless of any flagged duplicate
 *  - "merge": fold the row's non-empty fields into the matched existing lead
 *  - "skip": do nothing
 * Rows without a usable business name are always skipped, even if marked
 * "import" — never invented. Missing email/phone stay null ("Not available").
 */
export async function commitImport(request: ImportCommitRequest): Promise<CsvImportResult> {
  let imported = 0;
  let skipped = 0;
  let merged = 0;

  const existing = await listLeads();

  for (const { candidate, decision } of request.rows) {
    if (decision === "skip" || !candidate.valid || !candidate.businessName) {
      skipped += 1;
      continue;
    }

    if (decision === "merge") {
      const match =
        (candidate.duplicateOfLeadId && existing.find((l) => l.id === candidate.duplicateOfLeadId)) ||
        findDuplicate(
          { businessName: candidate.businessName, website: candidate.website, email: candidate.email, phone: candidate.phone },
          existing,
        )?.lead;

      if (match) {
        await updateLead(match.id, {
          city: match.city ?? candidate.city,
          region: match.region ?? candidate.region,
          category: match.category ?? candidate.category,
          website: match.website ?? candidate.website,
          websiteDomain: match.websiteDomain ?? (candidate.website ? canonicalizeUrl(candidate.website)?.domain ?? null : null),
          email: match.email ?? candidate.email,
          phone: match.phone ?? candidate.phone,
          contactPerson: match.contactPerson ?? candidate.contactPerson,
          contactRole: match.contactRole ?? candidate.contactRole,
          instagram: match.instagram ?? candidate.instagram,
          linkedin: match.linkedin ?? candidate.linkedin,
          address: match.address ?? candidate.address,
          notes: match.notes ?? candidate.notes,
          whyItFits: match.whyItFits ?? candidate.whyItFits,
        });
        await addActivity({
          leadId: match.id,
          type: "note_added",
          note: `Merged fields from CSV import (${request.source}), row ${candidate.rowNumber}.`,
          meta: null,
        });
        merged += 1;
        continue;
      }
      // No match found after all (stale preview) — fall through to a normal import.
    }

    const record = await createLead({
      businessName: candidate.businessName,
      region: candidate.region,
      city: candidate.city,
      category: candidate.category,
      website: candidate.website,
      websiteDomain: candidate.website ? canonicalizeUrl(candidate.website)?.domain ?? null : null,
      email: candidate.email,
      phone: candidate.phone,
      contactPerson: candidate.contactPerson,
      contactRole: candidate.contactRole,
      instagram: candidate.instagram,
      linkedin: candidate.linkedin,
      address: candidate.address,
      source: request.source,
      opportunityScore: null,
      whyItFits: candidate.whyItFits,
      status: "approved",
      notes: candidate.notes,
      lastContactedAt: null,
      nextFollowUpAt: null,
      opportunityBusinessId: null,
      opportunityEvidence: null,
    });
    existing.push(record);
    imported += 1;
  }

  return { imported, skipped, merged };
}
