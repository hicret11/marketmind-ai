"use client";

export type Platform = "instagram" | "youtube" | "tiktok";

export interface PlatformTabOption {
  id: Platform | "all";
  label: string;
  /** Small dot/badge shown when the platform isn't connected yet. */
  connected?: boolean;
}

/**
 * Shared platform tab bar reused across every Social Media page (Overview,
 * Content Calendar, Scheduled Posts, Content Library, Social Analytics) so
 * Instagram/YouTube/TikTok are switched the same way everywhere. Purely
 * presentational — each page owns its own data per tab.
 */
export function PlatformTabs({
  options,
  active,
  onChange,
}: {
  options: PlatformTabOption[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-gray-200 bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            active === opt.id ? "bg-mm-pink text-white" : "text-gray-600 hover:text-mm-ink"
          }`}
        >
          {opt.label}
          {opt.connected === false && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${active === opt.id ? "bg-white/70" : "bg-gray-300"}`}
              title="Not connected"
            />
          )}
        </button>
      ))}
    </div>
  );
}
