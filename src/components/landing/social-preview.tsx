import { Section, StatusBadge } from "./section";
import { Reveal } from "./reveal";

const FEATURES = [
  "Content Calendar",
  "Scheduled Posts",
  "Content Library",
  "Social Analytics",
  "Future automatic publishing",
];

const PLATFORMS = [
  { key: "photo", name: "Instagram", dot: "bg-mm-pink", path: "M4 7h16v13H4zM8 4h8M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" },
  { key: "short", name: "TikTok", dot: "bg-purple-500", path: "M9 6v10a3 3 0 1 1-3-3M9 6c1 2 3 3 5 3M9 6H9" },
  { key: "video", name: "YouTube", dot: "bg-mm-dark-rose", path: "M4 7h16v10H4zM11 10l4 2-4 2z" },
];

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SCHEDULE: Record<number, string[]> = {
  0: ["photo"],
  2: ["short", "photo"],
  3: ["video"],
  5: ["photo"],
  6: ["short"],
};

export function SocialPreview() {
  return (
    <Section
      eyebrow="Social media workspace"
      title="Plan the whole week in one view"
      description="A calendar-first workspace for planning, scheduling and reviewing social content — with automatic publishing on the roadmap."
    >
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {PLATFORMS.map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-mm-soft-pink bg-white/70 px-3 py-1.5 text-xs font-semibold text-mm-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-mm-dark-rose"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={p.path} />
                </svg>
                {p.name}
              </span>
            ))}
          </div>
          <ul className="mt-5 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-mm-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-mm-pink" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <StatusBadge status="Planned" />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl border border-mm-soft-pink/80 bg-white/80 p-2 shadow-[0_36px_100px_-48px_rgba(200,54,131,0.5)] backdrop-blur">
            <div className="rounded-[20px] bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-mm-ink">This week</p>
                <span className="text-xs text-mm-muted">April 2025</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK.map((day, i) => (
                  <div key={day} className="flex flex-col">
                    <span className="mb-1 text-center text-[10px] font-semibold uppercase text-mm-muted">
                      {day}
                    </span>
                    <div className="flex min-h-[74px] flex-col gap-1 rounded-lg border border-mm-soft-pink/70 bg-mm-bg/60 p-1.5">
                      {(SCHEDULE[i] ?? []).map((key, j) => {
                        const platform = PLATFORMS.find((p) => p.key === key);
                        return (
                          <span
                            key={`${key}-${j}`}
                            className={`h-1.5 rounded-full ${platform?.dot ?? "bg-mm-rose"}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-mm-muted">
                Colored bars represent scheduled posts per platform.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
