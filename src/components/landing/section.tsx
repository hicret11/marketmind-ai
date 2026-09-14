import type { ReactNode } from "react";
import { Reveal } from "./reveal";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
  centered = true,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 md:py-28 ${className}`}
    >
      {(eyebrow || title || description) && (
        <Reveal
          className={`mb-12 max-w-2xl md:mb-16 ${centered ? "mx-auto text-center" : ""}`}
        >
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mm-pink">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-mm-ink sm:text-4xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-4 text-base leading-relaxed text-mm-muted sm:text-lg">
              {description}
            </p>
          )}
        </Reveal>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Planned: "bg-mm-lavender text-purple-700 ring-purple-600/20",
  "Coming Soon": "bg-mm-soft-pink text-mm-dark-rose ring-mm-pink/25",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 ring-gray-500/20"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
