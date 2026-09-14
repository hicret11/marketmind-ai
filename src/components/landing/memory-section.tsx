import { Section } from "./section";
import { Reveal } from "./reveal";
import { LogoMark } from "./logo";

const NOTES = [
  {
    tag: "Lesson learned",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "Reaction creatives generated more shares.",
  },
  {
    tag: "Mistake",
    tone: "bg-mm-soft-pink/60 text-mm-dark-rose border-mm-rose/40",
    text: "Campaign launched before spending controls were checked.",
  },
  {
    tag: "Observation",
    tone: "bg-mm-lavender/60 text-purple-700 border-purple-200",
    text: "Profile visits performed better than website traffic in an early test.",
  },
];

export function MemorySection() {
  return (
    <Section
      eyebrow="Personal marketing memory"
      title="MarketMind learns with you"
      description="Every lesson, mistake and observation you save becomes part of how MarketMind advises you next time."
    >
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
        {NOTES.map((note, i) => (
          <Reveal key={note.tag} delay={i * 90}>
            <div className="h-full rounded-2xl border border-mm-soft-pink/80 bg-white/70 p-5 backdrop-blur">
              <span
                className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${note.tone}`}
              >
                {note.tag}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-mm-ink">
                &ldquo;{note.text}&rdquo;
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120} className="mx-auto mt-6 max-w-4xl">
        <div className="flex items-start gap-3 rounded-2xl border border-mm-rose/40 bg-gradient-to-br from-white to-mm-lavender/40 p-5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <LogoMark className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mm-dark-rose">
              MarketMind
            </p>
            <p className="mt-1 text-sm leading-relaxed text-mm-ink">
              &ldquo;Based on your previous lessons, I added budget controls to
              your launch checklist.&rdquo;
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
