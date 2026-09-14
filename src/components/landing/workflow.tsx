import { WORKFLOW_STEPS } from "@/lib/landing";
import { Section } from "./section";
import { Reveal } from "./reveal";

export function Workflow() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How MarketMind works"
      title="A loop that gets sharper every cycle"
      description="Five stages turn scattered marketing effort into a system that compounds."
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-3">
        {WORKFLOW_STEPS.map((step, i) => (
          <Reveal
            key={step.label}
            delay={i * 90}
            className="flex flex-1 items-stretch"
          >
            <div className="relative flex flex-1 flex-col rounded-2xl border border-mm-soft-pink/80 bg-white/70 p-5 backdrop-blur">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-mm-pink to-mm-dark-rose text-xs font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-mm-ink">
                {step.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mm-muted">
                {step.description}
              </p>

              {i < WORKFLOW_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-full my-1 -translate-x-1/2 text-mm-rose md:left-full md:top-1/2 md:my-0 md:-translate-x-1/2 md:-translate-y-1/2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 rotate-90 md:rotate-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
