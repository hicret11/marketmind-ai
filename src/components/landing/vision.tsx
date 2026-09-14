import { GlowField } from "./glow";
import { Reveal } from "./reveal";

export function Vision() {
  return (
    <section
      id="vision"
      className="relative isolate overflow-hidden px-5 py-24 sm:px-8 md:py-32"
    >
      <GlowField />
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-mm-ink sm:text-5xl">
          Generic AI tells you what usually works.
          <br />
          <span className="bg-gradient-to-r from-mm-pink via-mm-dark-rose to-purple-500 bg-clip-text text-transparent">
            MarketMind learns what works for you.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-mm-muted sm:text-lg">
          Marketing knowledge. Your experience. Your business data. One
          intelligent workspace.
        </p>
      </Reveal>
    </section>
  );
}
