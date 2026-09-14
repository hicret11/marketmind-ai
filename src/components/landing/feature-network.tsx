import { ECOSYSTEM_NODES } from "@/lib/landing";
import { FeatureCard } from "./feature-card";
import { FeatureIcon } from "./icons";
import { StatusBadge, Section } from "./section";
import { LogoMark } from "./logo";

const RX = 39;
const RY = 40;

const positions = ECOSYSTEM_NODES.map((_, i) => {
  const angle =
    (-90 + i * (360 / ECOSYSTEM_NODES.length)) * (Math.PI / 180);
  return {
    x: 50 + RX * Math.cos(angle),
    y: 50 + RY * Math.sin(angle),
  };
});

function CenterNode({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-mm-rose/40 bg-white/90 p-5 text-center shadow-[0_30px_80px_-30px_rgba(200,54,131,0.6)] backdrop-blur">
      <span
        className={`mx-auto mb-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender ${
          compact ? "h-11 w-11" : "h-12 w-12"
        }`}
      >
        <LogoMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      </span>
      <p className="text-sm font-bold text-mm-ink">MarketMind AI</p>
      <p className="mt-1 text-xs text-mm-muted">
        One mind behind your marketing.
      </p>
    </div>
  );
}

export function FeatureNetwork() {
  return (
    <Section
      id="ecosystem"
      eyebrow="The MarketMind ecosystem"
      title="One intelligence connecting every marketing function"
      description="MarketMind AI sits at the center — linking marketing knowledge, your context, your data and every workflow into a single adaptive system."
    >
      {/* Desktop: connected network */}
      <div className="relative mx-auto hidden aspect-[16/13] w-full max-w-4xl md:block">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mmConnector" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E84C9D" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          {positions.map((p, i) => (
            <g key={i}>
              <line
                x1="50"
                y1="50"
                x2={p.x}
                y2={p.y}
                stroke="url(#mmConnector)"
                strokeWidth="0.25"
                opacity="0.22"
              />
              <line
                x1="50"
                y1="50"
                x2={p.x}
                y2={p.y}
                stroke="url(#mmConnector)"
                strokeWidth="0.35"
                className="mm-connector"
                opacity="0.5"
              />
            </g>
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 z-10 w-52 -translate-x-1/2 -translate-y-1/2">
          <CenterNode />
        </div>

        {ECOSYSTEM_NODES.map((node, i) => {
          const flipUp = positions[i].y > 55;
          return (
            <div
              key={node.title}
              className="group absolute z-20 w-[168px] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${positions[i].x}%`,
                top: `${positions[i].y}%`,
              }}
            >
              <div
                className="mm-animate-float relative rounded-xl border border-mm-soft-pink bg-white/85 px-3 py-2.5 shadow-md backdrop-blur transition-all duration-300 group-hover:-translate-y-1 group-hover:border-mm-rose group-hover:shadow-xl"
                style={{ animationDelay: `${i * -0.5}s` }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
                    <FeatureIcon name={node.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-mm-ink">
                    {node.title}
                  </span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={node.status} />
                </div>

                <div
                  className={`pointer-events-none absolute left-1/2 z-30 w-56 -translate-x-1/2 rounded-lg border border-mm-soft-pink bg-white p-3 text-left text-xs leading-relaxed text-mm-muted opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 ${
                    flipUp ? "bottom-full mb-2" : "top-full mt-2"
                  }`}
                >
                  {node.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: clean responsive grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:hidden">
        <div className="sm:col-span-2">
          <CenterNode compact />
        </div>
        {ECOSYSTEM_NODES.map((node) => (
          <FeatureCard key={node.title} node={node} />
        ))}
      </div>
    </Section>
  );
}
