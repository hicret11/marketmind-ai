import { computeBalanceWarnings, type DatasetBalance } from "@/lib/evaluation/dataset-balance";

export function DatasetBalanceSummary({ balance }: { balance: DatasetBalance | null }) {
  if (!balance) return null;
  const total = balance.verifiedPositive + balance.verifiedNegative + balance.unverified;
  if (total === 0) return null;

  const warnings = computeBalanceWarnings(balance);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-mm-ink">Dataset balance</h3>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-green-700">{balance.verifiedPositive}</p>
          <p className="text-[11px] text-mm-muted">Verified positive</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-700">{balance.verifiedNegative}</p>
          <p className="text-[11px] text-mm-muted">Verified negative</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-700">{balance.unverified}</p>
          <p className="text-[11px] text-mm-muted">Needs Review</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      {balance.categoryDistribution.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-mm-ink">Category distribution</p>
          <ul className="mt-1 space-y-1">
            {balance.categoryDistribution.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[11px] text-mm-muted">
                <span className="w-32 shrink-0 truncate">{c.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-full rounded-full bg-mm-rose"
                    style={{ width: `${Math.round((c.count / total) * 100)}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
