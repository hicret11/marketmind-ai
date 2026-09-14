import type { RawBusiness, VerifiedBusiness } from "@/types/opportunity";
import { canonicalizeUrl, shortHash, slugify } from "./util";

function cleanText(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length ? trimmed : null;
}

function normalizePhone(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 5) return null;
  return hasPlus ? `+${digits}` : digits;
}

function normalizeEmail(value: string | undefined | null): string | null {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  // Only accept something that at least looks like an email; OSM occasionally
  // has junk in contact:email. Never invent one when absent.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function toVerified(raw: RawBusiness): VerifiedBusiness {
  const canonical = raw.website ? canonicalizeUrl(raw.website) : null;
  const categories = Array.from(
    new Set(
      [raw.category, ...(raw.categories ?? [])]
        .map((c) => cleanText(c))
        .filter((c): c is string => Boolean(c)),
    ),
  );
  const matchedCategories = Array.from(
    new Set([
      ...(raw.matchedCategory ? [raw.matchedCategory] : []),
      ...(raw.matchedCategories ?? []),
    ]),
  );

  return {
    id: shortHash(`${raw.provider}:${raw.sourceId}`),
    provider: raw.provider,
    sourceId: raw.sourceId,
    name: cleanText(raw.name) ?? raw.name,
    website: canonical?.href ?? null,
    websiteDomain: canonical?.domain ?? null,
    phone: normalizePhone(raw.phone),
    email: normalizeEmail(raw.email),
    address: cleanText(raw.address),
    city: cleanText(raw.city),
    postcode: cleanText(raw.postcode),
    country: cleanText(raw.country),
    openingHours: cleanText(raw.openingHours),
    category: cleanText(raw.category),
    categories,
    location: raw.location ?? null,
    rating: typeof raw.rating === "number" ? raw.rating : null,
    mapsUrl: cleanText(raw.mapsUrl),
    osmId: raw.osmId ?? null,
    osmType: raw.osmType ?? null,
    tags: raw.tags ?? null,
    matchedCategories,
    sourcePayload: raw.raw,
  };
}

function dedupeKey(business: VerifiedBusiness): string {
  if (business.websiteDomain) return `domain:${business.websiteDomain}`;
  const name = slugify(business.name);
  const locality = business.address
    ? slugify(business.address).split("-").slice(0, 4).join("-")
    : slugify(business.city ?? "");
  return `nameaddr:${name}:${locality}`;
}

/** Prioritizes businesses more likely to be useful once ranked/truncated to `limit`. */
function richnessScore(business: VerifiedBusiness): number {
  let score = 0;
  if (business.website) score += 3;
  if (business.phone) score += 2;
  if (business.email) score += 1;
  if (business.openingHours) score += 1;
  if (business.rating !== null) score += 1;
  if (business.category) score += 1;
  if (business.matchedCategories.length > 1) score += 1;
  return score;
}

/**
 * Normalizes provider records into {@link VerifiedBusiness}, drops records with
 * no usable name, removes duplicates (same OSM/provider id first, then same
 * website domain, then same normalized name + locality), and ranks the survivors
 * so the most useful businesses are the ones sent into website analysis when
 * more were returned than requested.
 */
export function normalizeBusinesses(
  raw: RawBusiness[],
  limit: number,
): { businesses: VerifiedBusiness[]; duplicatesRemoved: number } {
  const byKey = new Map<string, VerifiedBusiness>();
  const bySourceId = new Set<string>();
  let duplicatesRemoved = 0;

  for (const record of raw) {
    if (!cleanText(record.name)) {
      continue; // no usable business name — not a duplicate, just dropped
    }

    const sourceKey = `${record.provider}:${record.sourceId}`;
    if (bySourceId.has(sourceKey)) {
      duplicatesRemoved += 1;
      continue;
    }
    bySourceId.add(sourceKey);

    const verified = toVerified(record);
    const key = dedupeKey(verified);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, verified);
      continue;
    }

    duplicatesRemoved += 1;
    existing.matchedCategories = Array.from(
      new Set([...existing.matchedCategories, ...verified.matchedCategories]),
    );
    // Prefer whichever record is more complete for fields the other lacks.
    if (!existing.website && verified.website) {
      existing.website = verified.website;
      existing.websiteDomain = verified.websiteDomain;
    }
    if (!existing.phone && verified.phone) existing.phone = verified.phone;
    if (!existing.email && verified.email) existing.email = verified.email;
    if (!existing.openingHours && verified.openingHours) {
      existing.openingHours = verified.openingHours;
    }
  }

  const ranked = Array.from(byKey.values()).sort(
    (a, b) => richnessScore(b) - richnessScore(a),
  );

  return {
    businesses: ranked.slice(0, limit),
    duplicatesRemoved,
  };
}
