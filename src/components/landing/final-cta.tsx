import Link from "next/link";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="px-5 py-20 sm:px-8 md:py-28">
      <Reveal className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-[32px] border border-mm-rose/40 bg-gradient-to-br from-mm-soft-pink via-white to-mm-lavender px-6 py-14 text-center shadow-[0_50px_120px_-50px_rgba(200,54,131,0.55)] sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight text-mm-ink sm:text-4xl">
            Build smarter marketing around your business.
          </h2>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-8 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(232,76,157,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Enter MarketMind
            </Link>
          </div>
          <p className="mt-5 text-sm font-medium tracking-wide text-mm-muted">
            Plan. Discover. Learn. Grow.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
