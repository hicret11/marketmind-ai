import { Reveal } from "./reveal";
import { GlowField } from "./glow";

const DETECTED = [
  "Birthday packages",
  "Family audience",
  "Personalized experiences",
];

export function OpportunityShowcase() {
  return (
    <section
      id="opportunities"
      className="relative isolate overflow-hidden px-5 py-20 sm:px-8 md:py-28"
    >
      <GlowField className="opacity-60" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mm-pink">
            B2B opportunity discovery
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-mm-ink sm:text-4xl">
            We don&rsquo;t just find leads.
            <br />
            <span className="bg-gradient-to-r from-mm-pink to-purple-500 bg-clip-text text-transparent">
              We find where your product fits.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-mm-muted">
            MarketMind reads a real business, maps its offering and audience, then
            pinpoints the exact gap your product can fill — and how a partnership
            could start.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl border border-mm-soft-pink/80 bg-white/80 p-2 shadow-[0_40px_110px_-45px_rgba(200,54,131,0.55)] backdrop-blur">
            <div className="rounded-[20px] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-mm-muted">
                    Company
                  </p>
                  <p className="text-lg font-bold text-mm-ink">
                    Happy Kids Venue
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-mm-soft-pink to-mm-lavender px-4 py-2 text-center">
                  <span className="text-xl font-extrabold text-mm-dark-rose">
                    92%
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-mm-muted">
                    Match
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-mm-muted">
                  Detected
                </p>
                <ul className="mt-2 space-y-1.5">
                  {DETECTED.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-mm-ink"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="rounded-xl border border-mm-soft-pink bg-mm-soft-pink/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-dark-rose">
                    Experience gap
                  </p>
                  <p className="mt-0.5 text-sm text-mm-ink">
                    No personalized music experience detected.
                  </p>
                </div>
                <div className="rounded-xl border border-mm-lavender bg-mm-lavender/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                    Product match
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-mm-ink">
                    Personalized Birthday Song
                  </p>
                </div>
                <div className="rounded-xl border border-mm-soft-pink bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
                    Partnership opportunity
                  </p>
                  <p className="mt-0.5 text-sm text-mm-ink">
                    Add the product as a premium birthday package experience.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-mm-ink px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Suggested pilot
                </span>
                <span className="text-sm font-bold text-white">
                  10 bookings / 30 days
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
