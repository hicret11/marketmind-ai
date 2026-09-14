import { CrmError } from "./errors";
import { CRM_LEAD_STATUSES, type CrmLeadStatus, type CsvCandidateLead, type CsvRowDecision } from "@/types/crm";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseStatus(value: unknown): CrmLeadStatus | undefined {
  return typeof value === "string" && (CRM_LEAD_STATUSES as readonly string[]).includes(value)
    ? (value as CrmLeadStatus)
    : undefined;
}

export interface ManualLeadInput {
  businessName: string;
  region: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  contactRole: string | null;
  instagram: string | null;
  linkedin: string | null;
  address: string | null;
  notes: string | null;
  status: CrmLeadStatus;
}

/** Manual "add lead" form — source is always "Manual" for these. */
export function parseManualLead(body: unknown): ManualLeadInput {
  if (!isRecord(body)) throw new CrmError("INVALID_REQUEST", "Request body must be an object.");
  const businessName = str(body.businessName);
  if (!businessName) throw new CrmError("INVALID_REQUEST", "`businessName` is required.");

  return {
    businessName,
    region: str(body.region),
    city: str(body.city),
    category: str(body.category),
    website: str(body.website),
    email: str(body.email),
    phone: str(body.phone),
    contactPerson: str(body.contactPerson),
    contactRole: str(body.contactRole),
    instagram: str(body.instagram),
    linkedin: str(body.linkedin),
    address: str(body.address),
    notes: str(body.notes),
    status: parseStatus(body.status) ?? "approved",
  };
}

export interface UpdateLeadInput {
  status?: CrmLeadStatus;
  notes?: string | null;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
}

export function parseUpdateLead(body: unknown): UpdateLeadInput {
  if (!isRecord(body)) throw new CrmError("INVALID_REQUEST", "Request body must be an object.");
  const update: UpdateLeadInput = {};
  const status = parseStatus(body.status);
  if (status) update.status = status;
  if (body.notes !== undefined) update.notes = str(body.notes);
  if (body.lastContactedAt !== undefined) update.lastContactedAt = str(body.lastContactedAt);
  if (body.nextFollowUpAt !== undefined) update.nextFollowUpAt = str(body.nextFollowUpAt);
  return update;
}

export interface ImportPreviewRequest {
  csvText: string;
  source: string;
}

export function parseImportPreviewBody(body: unknown): ImportPreviewRequest {
  if (!isRecord(body)) throw new CrmError("INVALID_REQUEST", "Request body must be an object.");
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  if (!csvText.trim()) throw new CrmError("INVALID_REQUEST", "`csvText` is required.");
  const source = str(body.source) ?? "CSV";
  return { csvText, source };
}

export interface ImportCommitRow {
  candidate: CsvCandidateLead;
  decision: CsvRowDecision;
}

export interface ImportCommitRequest {
  source: string;
  rows: ImportCommitRow[];
}

const DECISIONS: CsvRowDecision[] = ["import", "skip", "merge"];

function parseCandidate(value: unknown): CsvCandidateLead {
  if (!isRecord(value)) throw new CrmError("INVALID_REQUEST", "Each row must be an object.");
  return {
    rowNumber: typeof value.rowNumber === "number" ? value.rowNumber : 0,
    businessName: str(value.businessName),
    region: str(value.region),
    city: str(value.city),
    category: str(value.category),
    website: str(value.website),
    email: str(value.email),
    phone: str(value.phone),
    contactPerson: str(value.contactPerson),
    contactRole: str(value.contactRole),
    notes: str(value.notes),
    whyItFits: str(value.whyItFits),
    instagram: str(value.instagram),
    linkedin: str(value.linkedin),
    address: str(value.address),
    issues: Array.isArray(value.issues) ? value.issues.filter((i): i is string => typeof i === "string") : [],
    valid: value.valid === true,
    duplicateOfLeadId: str(value.duplicateOfLeadId),
    duplicateReason: str(value.duplicateReason),
  };
}

export function parseImportCommitBody(body: unknown): ImportCommitRequest {
  if (!isRecord(body)) throw new CrmError("INVALID_REQUEST", "Request body must be an object.");
  const source = str(body.source) ?? "CSV";
  if (!Array.isArray(body.rows)) throw new CrmError("INVALID_REQUEST", "`rows` must be an array.");

  const rows: ImportCommitRow[] = body.rows.filter(isRecord).map((r) => {
    const decision = typeof r.decision === "string" && DECISIONS.includes(r.decision as CsvRowDecision)
      ? (r.decision as CsvRowDecision)
      : "skip";
    return { candidate: parseCandidate(r.candidate ?? r), decision };
  });

  return { source, rows };
}

export interface FromOpportunityInput {
  businessName: string;
  website: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  opportunityScore: number | null;
  whyItFits: string | null;
  opportunityBusinessId: string;
  evidenceCount: number;
  signalsDetected: string[];
  matchedCategories: string[];
}

export function parseFromOpportunityBody(body: unknown): FromOpportunityInput {
  if (!isRecord(body)) throw new CrmError("INVALID_REQUEST", "Request body must be an object.");
  const business = isRecord(body.business) ? body.business : null;
  if (!business || typeof business.id !== "string" || typeof business.name !== "string") {
    throw new CrmError("INVALID_REQUEST", "`business` (VerifiedBusiness) is required.");
  }

  const fitScore = isRecord(body.fitScore) ? body.fitScore : {};
  const signals = Array.isArray(body.signals) ? body.signals : [];
  const evidence = Array.isArray(body.evidence) ? body.evidence : [];

  return {
    businessName: business.name,
    website: str(business.website),
    category: str(business.category),
    address: str(business.address),
    city: str(business.city),
    region: str(business.country),
    opportunityScore: typeof fitScore.score === "number" ? fitScore.score : null,
    whyItFits: str(body.whyItFits),
    opportunityBusinessId: business.id,
    evidenceCount: evidence.length,
    signalsDetected: signals
      .filter(isRecord)
      .filter((s) => s.status === "detected")
      .map((s) => str(s.label) ?? String(s.key ?? ""))
      .filter(Boolean),
    matchedCategories: Array.isArray(business.matchedCategories)
      ? business.matchedCategories.filter((c): c is string => typeof c === "string")
      : [],
  };
}
