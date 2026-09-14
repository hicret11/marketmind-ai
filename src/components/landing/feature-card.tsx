import type { EcosystemNode } from "@/lib/landing";
import { FeatureIcon } from "./icons";
import { StatusBadge } from "./section";

interface FeatureCardProps {
  node: EcosystemNode;
  className?: string;
  compact?: boolean;
}

export function FeatureCard({ node, className = "", compact = false }: FeatureCardProps) {
  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-mm-soft-pink/80 bg-white/70 p-5 shadow-[0_10px_40px_-24px_rgba(200,54,131,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-mm-rose hover:shadow-[0_24px_60px_-28px_rgba(200,54,131,0.55)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender text-mm-dark-rose">
          <FeatureIcon name={node.icon} className="h-5 w-5" />
        </span>
        <StatusBadge status={node.status} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-mm-ink">{node.title}</h3>
      {!compact && (
        <p className="mt-1.5 text-sm leading-relaxed text-mm-muted">
          {node.description}
        </p>
      )}
    </article>
  );
}
