import { findDuplicate } from "./dedupe";
import { canonicalizeUrl } from "@/lib/opportunity/util";
import type { CrmLead, CsvCandidateLead, CsvImportPreview } from "@/types/crm";

/**
 * Flexible CSV import — never assumes one exact schema. Column headers are
 * matched against a broad alias list (case/punctuation-insensitive); any
 * column MarketMind doesn't recognize is left out of the mapped fields but
 * reported back in `unmappedColumns`, never silently discarded.
 */

type CanonicalField =
  | "businessName"
  | "website"
  | "email"
  | "phone"
  | "category"
  | "city"
  | "region"
  | "contactPerson"
  | "contactRole"
  | "notes"
  | "instagram"
  | "linkedin"
  | "address"
  // Richer B2B lead-research exports (e.g. "Why Strong Fit", "Lead Score (1-10)")
  // carry real qualitative content beyond the basic CRM fields — mapped
  // separately so they can be composed into whyItFits/notes, never dropped.
  | "whyStrongFit"
  | "leadScore"
  | "partnershipAngle"
  | "outreachHook"
  | "birthdayService"
  | "evidenceSource";

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  businessName: ["company", "business_name", "company_name", "business", "name", "businessname"],
  website: ["website", "site", "url", "domain", "web"],
  email: ["email", "email_address", "emailaddress", "e_mail", "verified_work_email", "work_email", "company_general_email", "general_email"],
  phone: ["phone", "mobile", "phone_number", "tel", "telephone", "phonenumber", "cell", "mobile_phone", "company_phone"],
  category: ["category", "industry", "business_type", "businesstype", "niche", "sector", "type", "business_category"],
  city: ["city", "town"],
  region: ["country", "region", "state", "location", "country_region"],
  contactPerson: ["contact_name", "contact", "decision_maker", "decisionmaker", "contactperson", "owner", "poc", "decision_maker_name"],
  contactRole: ["role", "title", "position", "decision_maker_role", "jobtitle", "job_title"],
  notes: ["notes", "note", "comment", "comments", "remarks"],
  instagram: ["instagram", "ig", "instagram_handle"],
  linkedin: ["linkedin", "linkedin_url", "linkedin_profile"],
  address: ["address", "street", "street_address", "streetaddress"],
  whyStrongFit: ["why_strong_fit", "why_this_fits", "why_it_fits", "why_fit"],
  leadScore: ["lead_score_1_10", "lead_score", "score"],
  partnershipAngle: ["suggested_partnership_angle", "partnership_angle"],
  outreachHook: ["personalized_outreach_hook", "outreach_hook"],
  birthdayService: ["birthday_related_service"],
  evidenceSource: ["evidence_source"],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapColumns(headers: string[]): { mapping: Record<CanonicalField, number>; unmapped: string[] } {
  const normalized = headers.map(normalizeHeader);
  const mapping = {} as Record<CanonicalField, number>;
  const claimed = new Set<number>();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [CanonicalField, string[]][]) {
    const aliasSet = new Set(aliases.map((a) => a.replace(/[^a-z0-9]+/g, "_")));
    const index = normalized.findIndex((h, i) => !claimed.has(i) && aliasSet.has(h));
    if (index >= 0) {
      mapping[field] = index;
      claimed.add(index);
    }
  }

  const unmapped = headers.filter((_, i) => !claimed.has(i));
  return { mapping, unmapped };
}

/** Minimal, dependency-free RFC4180-ish CSV parser — handles quoted fields with embedded commas/newlines/escaped quotes. */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  const [headers, ...dataRows] = nonEmpty;
  return { headers: (headers ?? []).map((h) => h.trim()), rows: dataRows };
}

function cell(row: string[], index: number | undefined): string | null {
  if (index === undefined) return null;
  const value = row[index]?.trim();
  return value ? value : null;
}

/**
 * When a CSV has no country/region column at all, fall back to what the
 * import label itself says (e.g. "CSV - UK" batches are, by definition, UK
 * leads) rather than leaving every row's region blank. Never overrides an
 * actual region column value.
 */
function regionFromSource(source: string): string | null {
  const s = source.toLowerCase();
  if (/\buk\b|united kingdom|britain/.test(s)) return "UK";
  if (/dubai|uae|united arab emirates/.test(s)) return "UAE";
  return null;
}

export function buildImportPreview(
  csvText: string,
  source: string,
  existingLeads: CrmLead[],
): CsvImportPreview {
  const { headers, rows } = parseCsvText(csvText);
  const { mapping, unmapped } = mapColumns(headers);
  const mappedColumns: Record<string, string> = {};
  for (const [field, index] of Object.entries(mapping)) {
    mappedColumns[field] = headers[index as number];
  }

  let missingWebsiteCount = 0;
  let duplicateCount = 0;
  let validCount = 0;

  // Rows already processed in THIS file — checked in addition to the existing
  // CRM, so duplicate rows within the same CSV are caught too, not just
  // duplicates of leads already in the CRM.
  const seenInBatch: CrmLead[] = [];

  const candidates: CsvCandidateLead[] = rows.map((row, i) => {
    const businessName = cell(row, mapping.businessName);
    const website = cell(row, mapping.website);
    const email = cell(row, mapping.email);
    const phone = cell(row, mapping.phone);
    const issues: string[] = [];

    if (!businessName) issues.push("Missing business name");
    if (!website) {
      issues.push("Missing website");
      missingWebsiteCount += 1;
    }

    const valid = Boolean(businessName);
    if (valid) validCount += 1;

    const candidateInput = { businessName, website, email, phone };
    const existingDuplicate = findDuplicate(candidateInput, existingLeads);
    const batchDuplicate = !existingDuplicate ? findDuplicate(candidateInput, seenInBatch) : null;

    let duplicateOfLeadId: string | null = null;
    let duplicateReason: string | null = null;
    if (existingDuplicate) {
      duplicateOfLeadId = existingDuplicate.lead.id;
      duplicateReason = existingDuplicate.reason;
      duplicateCount += 1;
    } else if (batchDuplicate) {
      duplicateReason = `${batchDuplicate.reason} — duplicate of row ${batchDuplicate.lead.id} in this file`;
      duplicateCount += 1;
    }

    if (valid) {
      // Placeholder id carries the row number so a later batch-duplicate match
      // can reference "row N" — never persisted, only used within this preview.
      seenInBatch.push({
        id: String(i + 1),
        businessName,
        website,
        websiteDomain: website ? canonicalizeUrl(website)?.domain ?? null : null,
        email,
        phone,
      } as CrmLead);
    }

    // Compose whyItFits / notes from the richer research columns (e.g. "Why
    // Strong Fit", "Lead Score (1-10)", "Suggested Partnership Angle") when
    // present — real content from the CSV, never invented, never dropped.
    const whyStrongFit = cell(row, mapping.whyStrongFit);
    const leadScore = cell(row, mapping.leadScore);
    const whyItFits =
      [whyStrongFit, leadScore ? `Lead score: ${leadScore}/10 (from ${source}).` : null]
        .filter(Boolean)
        .join(" ") || null;

    const baseNotes = cell(row, mapping.notes);
    const birthdayService = cell(row, mapping.birthdayService);
    const evidenceSource = cell(row, mapping.evidenceSource);
    const partnershipAngle = cell(row, mapping.partnershipAngle);
    const outreachHook = cell(row, mapping.outreachHook);
    const notes =
      [
        baseNotes,
        birthdayService ? `Birthday-related service: ${birthdayService}` : null,
        evidenceSource ? `Evidence: ${evidenceSource}` : null,
        partnershipAngle ? `Suggested partnership angle: ${partnershipAngle}` : null,
        outreachHook ? `Outreach hook: "${outreachHook}"` : null,
      ]
        .filter(Boolean)
        .join("\n\n") || null;

    return {
      rowNumber: i + 1,
      businessName,
      region: cell(row, mapping.region) ?? regionFromSource(source),
      city: cell(row, mapping.city),
      category: cell(row, mapping.category),
      website,
      email,
      phone,
      contactPerson: cell(row, mapping.contactPerson),
      contactRole: cell(row, mapping.contactRole),
      notes,
      whyItFits,
      instagram: cell(row, mapping.instagram),
      linkedin: cell(row, mapping.linkedin),
      address: cell(row, mapping.address),
      issues,
      valid,
      duplicateOfLeadId,
      duplicateReason,
    };
  });

  return {
    source,
    rowsFound: rows.length,
    validCount,
    missingWebsiteCount,
    duplicateCount,
    unmappedColumns: unmapped,
    mappedColumns,
    rows: candidates,
  };
}
