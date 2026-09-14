import { SING_MY_BIRTHDAY } from "@/lib/opportunity/product-context";

/**
 * Read-only summary of the fixed product context every opportunity is scored
 * against. Makes it explicit what "fit" means here.
 */
export function ProductContextPanel() {
  const p = SING_MY_BIRTHDAY;
  return (
    <section className="rounded-xl border border-mm-soft-pink/80 bg-gradient-to-br from-white to-mm-soft-pink/25 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-mm-pink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          Product context
        </span>
        <h2 className="text-base font-semibold text-mm-ink">{p.name}</h2>
        <span className="text-sm text-mm-muted">— {p.tagline}</span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mm-muted">
        {p.description}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-dark-rose">
            Features matched against
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-mm-ink">
            {p.features.map((f) => (
              <li key={f.id}>· {f.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-dark-rose">
            Ideal partner signals
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-mm-ink">
            {p.idealPartnerSignals.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-dark-rose">
            Integration models
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-mm-ink">
            {p.integrationModels.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-mm-muted">
        MarketMind currently supports one product context. Multi-company support
        is not enabled yet.
      </p>
    </section>
  );
}
