import { Section, StatusBadge } from "./section";
import { Reveal } from "./reveal";
import { FeatureIcon } from "./icons";

const TOOLS = [
  { name: "AI Writer", icon: "note" },
  { name: "AI Image", icon: "studio" },
  { name: "AI Audio", icon: "spark" },
  { name: "AI Video", icon: "calendar" },
];

export function AiStudioPreview() {
  return (
    <Section
      id="ai-studio"
      eyebrow="AI Studio"
      title="From strategy to finished assets"
      description="From strategy to creation — future MarketMind tools will help turn marketing ideas into ready-to-publish assets."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool, i) => (
          <Reveal key={tool.name} delay={i * 80}>
            <div className="group h-full rounded-2xl border border-mm-soft-pink/80 bg-white/70 p-5 text-center backdrop-blur transition-transform duration-300 hover:-translate-y-1">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
                <FeatureIcon name={tool.icon} className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-mm-ink">
                {tool.name}
              </p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status="Coming Soon" />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
