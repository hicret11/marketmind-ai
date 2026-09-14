/**
 * Decorative pink / lavender background glows. Purely presentational and
 * hidden from assistive tech. Motion is gentle and respects
 * prefers-reduced-motion (see globals.css).
 */
export function GlowField({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="mm-animate-glow absolute -left-24 -top-24 h-72 w-72 rounded-full bg-mm-rose/40 blur-3xl sm:h-96 sm:w-96" />
      <div
        className="mm-animate-glow absolute -right-16 top-10 h-64 w-64 rounded-full bg-mm-lavender/70 blur-3xl sm:h-80 sm:w-80"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="mm-animate-glow absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-mm-soft-pink/80 blur-3xl sm:h-96 sm:w-96"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}
