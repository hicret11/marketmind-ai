import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  { label: "Features", href: "#ecosystem" },
  { label: "Vision", href: "#vision" },
  { label: "AI Studio", href: "#ai-studio" },
  { label: "Contact", href: "mailto:hello@marketmind.ai" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-mm-soft-pink/70 bg-mm-bg px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo />
          <p className="text-xs text-mm-muted">
            An adaptive AI marketing intelligence platform.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-mm-muted transition-colors hover:text-mm-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-xs text-mm-muted">
        © {new Date().getFullYear()} MarketMind AI. Features marked Planned or
        Coming Soon indicate product direction, not current availability.
      </p>
    </footer>
  );
}
