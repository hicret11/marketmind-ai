import type { ModelRegistryEntry, ModelStatus } from "@/types/evaluation";

const STATUS_STYLE: Record<ModelStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-green-100 text-green-800" },
  not_configured: { label: "Not Configured", className: "bg-gray-100 text-gray-600" },
  model_unavailable: { label: "Model Unavailable", className: "bg-amber-100 text-amber-800" },
  provider_error: { label: "Provider Error", className: "bg-red-100 text-red-700" },
  rate_limited: { label: "Rate Limited", className: "bg-orange-100 text-orange-800" },
};

export function StatusBadge({ status }: { status: ModelStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

/** Always renders all six model slots — never hides an unconfigured one. */
export function ModelRegistryList({ models }: { models: ModelRegistryEntry[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((m) => (
        <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-mm-ink">{m.displayName}</span>
            <StatusBadge status={m.status} />
          </div>
          <div className="mt-1 text-xs text-mm-muted">{m.provider}</div>
          <div className="mt-2 rounded bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600">
            {m.requestedModelId}
          </div>
          {m.statusDetail && <p className="mt-2 text-[11px] text-mm-muted">{m.statusDetail}</p>}
          {m.freeTierNote && <p className="mt-1 text-[11px] text-mm-muted">{m.freeTierNote}</p>}
        </div>
      ))}
    </div>
  );
}
