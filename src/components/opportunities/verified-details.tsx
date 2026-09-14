import type { VerifiedBusiness } from "@/types/opportunity";
import { SectionLabel } from "./ui";

const NOT_AVAILABLE = "Not available";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-mm-muted">{label}</span>
      <span
        className={value ? "text-right text-mm-ink" : "text-right italic text-gray-400"}
      >
        {value ?? NOT_AVAILABLE}
      </span>
    </div>
  );
}

/**
 * Every verified field, shown explicitly — including the ones a provider (most
 * often OpenStreetMap) simply doesn't have. Missing data is always labeled
 * "Not available", never guessed or left implicit.
 */
export function VerifiedDetails({ business }: { business: VerifiedBusiness }) {
  const isOsm = business.provider === "openstreetmap";

  return (
    <div>
      <SectionLabel>Verified business details</SectionLabel>
      <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-3">
        <Row label="Website" value={business.website} />
        <Row label="Phone" value={business.phone} />
        <Row label="Email" value={business.email} />
        <Row label="Address" value={business.address} />
        <Row label="City" value={business.city} />
        <Row label="Postcode" value={business.postcode} />
        <Row label="Country" value={business.country} />
        <Row label="Opening hours" value={business.openingHours} />
        <Row label="Category" value={business.category} />
        {isOsm && (
          <Row
            label="OSM reference"
            value={
              business.osmType && business.osmId
                ? `${business.osmType}/${business.osmId}`
                : null
            }
          />
        )}
      </div>
    </div>
  );
}
