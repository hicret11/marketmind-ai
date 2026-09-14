import { canonicalizeUrl, slugify } from "@/lib/opportunity/util";
import type { CrmLead } from "@/types/crm";

/**
 * Duplicate detection — reused across CSV import and the Opportunity → CRM
 * flow. Checks (in order of confidence): website domain, phone, email, then
 * normalized business name. Never silently merges; callers decide what to do
 * with a match (Skip / Merge / Import anyway).
 */

export interface DuplicateMatch {
  lead: CrmLead;
  reason: string;
}

export function normalizeDomain(website: string | null): string | null {
  if (!website) return null;
  return canonicalizeUrl(website)?.domain ?? null;
}

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 5 ? digits : null;
}

export function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function normalizeName(name: string | null): string | null {
  if (!name) return null;
  const slug = slugify(name);
  return slug.length >= 2 ? slug : null;
}

export function findDuplicate(
  candidate: {
    businessName: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    opportunityBusinessId?: string | null;
  },
  existing: CrmLead[],
): DuplicateMatch | null {
  // Exact linkage to the same Opportunity Discovery business — the strongest signal.
  if (candidate.opportunityBusinessId) {
    const match = existing.find((l) => l.opportunityBusinessId === candidate.opportunityBusinessId);
    if (match) return { lead: match, reason: "Same Opportunity Discovery business" };
  }

  const domain = normalizeDomain(candidate.website);
  if (domain) {
    const match = existing.find((l) => l.websiteDomain === domain);
    if (match) return { lead: match, reason: `Same website domain (${domain})` };
  }

  const email = normalizeEmail(candidate.email);
  if (email) {
    const match = existing.find((l) => normalizeEmail(l.email) === email);
    if (match) return { lead: match, reason: `Same email (${email})` };
  }

  const phone = normalizePhone(candidate.phone);
  if (phone) {
    const match = existing.find((l) => normalizePhone(l.phone) === phone);
    if (match) return { lead: match, reason: "Same phone number" };
  }

  const name = normalizeName(candidate.businessName);
  if (name) {
    const match = existing.find((l) => normalizeName(l.businessName) === name);
    if (match) return { lead: match, reason: `Similar business name (${candidate.businessName})` };
  }

  return null;
}
