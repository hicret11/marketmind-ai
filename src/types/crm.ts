/**
 * CRM types.
 *
 * The CRM holds ONLY leads a human intentionally approved or imported — never
 * every Opportunity Discovery result automatically. A missing email/phone is
 * `null`, always rendered as "Not available"; nothing here is invented to
 * fill a gap.
 */

export const CRM_LEAD_STATUSES = [
  "approved",
  "to_contact",
  "contacted",
  "replied",
  "meeting",
  "interested",
  "converted",
  "not_interested",
  "no_response",
] as const;
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

export const CRM_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  approved: "Approved",
  to_contact: "To Contact",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  interested: "Interested",
  converted: "Converted",
  not_interested: "Not Interested",
  no_response: "No Response",
};

export const DEFAULT_IMPORTED_LEAD_STATUS: CrmLeadStatus = "approved";

/** Well-known sources, shown as suggestions — the field itself is free text. */
export const KNOWN_CRM_SOURCES = ["Opportunity Discovery", "Manual"] as const;

export interface CrmLeadEvidence {
  /** Ids of EvidenceSnippet rows from the originating Opportunity Discovery result, kept for reference. */
  evidenceCount: number;
  signalsDetected: string[];
  matchedCategories: string[];
}

export interface CrmLead {
  id: string;
  businessName: string;
  region: string | null; // country / region
  city: string | null;
  category: string | null;
  website: string | null;
  websiteDomain: string | null; // normalized, used for dedupe — derived, never shown as a separate editable field
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  contactRole: string | null;
  instagram: string | null;
  linkedin: string | null;
  address: string | null;
  source: string;
  opportunityScore: number | null;
  whyItFits: string | null;
  status: CrmLeadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  /** Set only when source = Opportunity Discovery — the VerifiedBusiness.id, for "Already in CRM" dedupe. */
  opportunityBusinessId: string | null;
  /** Reference-only evidence summary from Opportunity Discovery, never refetched or re-scored here. */
  opportunityEvidence: CrmLeadEvidence | null;
}

export const CRM_ACTIVITY_TYPES = [
  "added",
  "email_sent",
  "whatsapp",
  "call",
  "follow_up",
  "reply_received",
  "meeting",
  "status_changed",
  "note_added",
] as const;
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

export const CRM_ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  added: "Added to CRM",
  email_sent: "Email sent",
  whatsapp: "WhatsApp",
  call: "Phone call",
  follow_up: "Follow-up",
  reply_received: "Reply received",
  meeting: "Meeting",
  status_changed: "Status changed",
  note_added: "Note added",
};

export interface CrmActivity {
  id: string;
  leadId: string;
  type: CrmActivityType;
  note: string | null;
  createdAt: string;
  /** e.g. { from: "approved", to: "contacted" } for a status_changed entry. */
  meta: Record<string, string> | null;
}

/* -------------------------------------------------------------------------- */
/* CSV import                                                                  */
/* -------------------------------------------------------------------------- */

export interface CsvCandidateLead {
  /** Row number in the source file (1-based, header excluded), for user reference. */
  rowNumber: number;
  businessName: string | null;
  region: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  contactRole: string | null;
  notes: string | null;
  whyItFits: string | null;
  instagram: string | null;
  linkedin: string | null;
  address: string | null;
  /** Why this row can't be imported as-is, if at all. */
  issues: string[];
  /** True when the row has at minimum a usable business name. */
  valid: boolean;
  /** Existing CRM lead this looks like a duplicate of, if any. */
  duplicateOfLeadId: string | null;
  duplicateReason: string | null;
}

export interface CsvImportPreview {
  source: string;
  rowsFound: number;
  validCount: number;
  missingWebsiteCount: number;
  duplicateCount: number;
  unmappedColumns: string[];
  mappedColumns: Record<string, string>; // canonical field -> original header
  rows: CsvCandidateLead[];
}

export type CsvRowDecision = "import" | "skip" | "merge";

export interface CsvImportResult {
  imported: number;
  skipped: number;
  merged: number;
}
