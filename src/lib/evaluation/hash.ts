import { shortHash } from "@/lib/opportunity/util";

export { shortHash };

/** Dataset fingerprint — changes whenever the case set's ids or content changes. */
export function fingerprintCases(
  cases: Array<{ id: string; input: unknown; groundTruth: unknown; reviewStatus: string }>,
): string {
  const sorted = [...cases].sort((a, b) => a.id.localeCompare(b.id));
  const signature = sorted
    .map((c) => `${c.id}:${c.reviewStatus}:${JSON.stringify(c.input)}:${JSON.stringify(c.groundTruth)}`)
    .join("|");
  return shortHash(signature);
}
