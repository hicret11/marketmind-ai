import Link from "next/link";
import { GlowField } from "./glow";
import { Reveal } from "./reveal";
import { LogoMark } from "./logo";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
      <GlowField />

      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-mm-soft-pink bg-white/70 px-4 py-1.5 text-xs font-semibold text-mm-dark-rose shadow-sm backdrop-blur">
            <span className="mm-node-pulse h-1.5 w-1.5 rounded-full bg-mm-pink" />
            AI-powered marketing intelligence
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.1] tracking-tight text-mm-ink sm:text-6xl">
            Your marketing brain,
            <br />
            <span className="bg-gradient-to-r from-mm-pink via-mm-dark-rose to-purple-500 bg-clip-text text-transparent">
              built around your business.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-mm-muted sm:text-lg">
            Plan smarter, discover opportunities and turn your own business data
            into marketing decisions — all from one intelligent workspace.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(232,76,157,0.8)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Explore MarketMind
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-full border border-mm-soft-pink bg-white/70 px-6 py-3 text-sm font-semibold text-mm-ink backdrop-blur transition-colors hover:border-mm-rose sm:w-auto"
            >
              See how it works
            </Link>
          </div>
        </Reveal>
      </div>

      <Reveal delay={320} className="mx-auto mt-16 max-w-4xl">
        <div className="relative rounded-3xl border border-mm-soft-pink/80 bg-white/60 p-3 shadow-[0_40px_120px_-50px_rgba(200,54,131,0.55)] backdrop-blur">
          <div className="rounded-2xl bg-gradient-to-br from-white to-mm-soft-pink/40 p-8 sm:p-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="mm-animate-float inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                <LogoMark className="h-10 w-10" />
              </span>
              <p className="text-lg font-semibold text-mm-ink">
                One mind behind your marketing.
              </p>
              <p className="max-w-md text-sm text-mm-muted">
                Marketing knowledge, company context, your own lessons and your
                business data — connected and working together.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
