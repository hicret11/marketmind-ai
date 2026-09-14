import { Section, StatusBadge } from "./section";
import { Reveal } from "./reveal";

const ROWS = [
  {
    label: "Data finding",
    value: "Video-package users show stronger purchase intent.",
  },
  {
    label: "Marketing meaning",
    value:
      "Customers engaging with richer personalized experiences may have higher conversion potential.",
  },
  {
    label: "Recommendation",
    value: "Test the video package as a separate paid-ad angle.",
  },
];

export function DataPreview() {
  return (
    <Section
      eyebrow="Data intelligence"
      title="Turn business data into decisions"
      description="Connect your business data and MarketMind translates raw numbers into marketing meaning and next experiments."
    >
      <Reveal className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-mm-soft-pink/80 bg-white/80 p-2 shadow-[0_36px_100px_-48px_rgba(200,54,131,0.5)] backdrop-blur">
          <div className="rounded-[20px] bg-white p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-bold text-mm-ink">
                Insight preview
              </p>
              <StatusBadge status="Planned" />
            </div>
            <ol className="space-y-4">
              {ROWS.map((row, i) => (
                <li key={row.label} className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mm-pink to-mm-dark-rose text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-mm-ink">
                      {row.value}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-mm-soft-pink pt-4 text-xs text-mm-muted">
              Data Intelligence — planned integration. Shown here as product
              direction, not a live connection.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
