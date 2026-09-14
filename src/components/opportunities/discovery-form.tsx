"use client";

import { useState } from "react";
import {
  DEFAULT_RESULT_COUNT,
  RESULT_COUNT_OPTIONS,
  groupedCategoryOptions,
} from "@/lib/opportunity/categories";
import type { DiscoveryQuery } from "@/types/opportunity";

const GROUPS = groupedCategoryOptions();

export function DiscoveryForm({
  disabled,
  loading,
  onSubmit,
}: {
  disabled: boolean;
  loading: boolean;
  onSubmit: (query: DiscoveryQuery) => void;
}) {
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState<number>(DEFAULT_RESULT_COUNT);
  const [analyzeWebsites, setAnalyzeWebsites] = useState(true);

  const canSubmit =
    !disabled && !loading && location.trim().length > 1 && selected.length > 0;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      location: location.trim(),
      categories: selected,
      limit,
      analyzeWebsites,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-sm font-medium text-mm-ink">Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, region or address — e.g. London, UK"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink focus:ring-2 focus:ring-mm-pink/20"
            disabled={disabled || loading}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-mm-ink">Results</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-mm-pink focus:ring-2 focus:ring-mm-pink/20 md:w-28"
            disabled={disabled || loading}
          >
            {RESULT_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-4 space-y-3" disabled={disabled || loading}>
        <legend className="text-sm font-medium text-mm-ink">
          Business categories
        </legend>
        {GROUPS.map(({ group, options }) => (
          <div key={group}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
              {group}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {options.map((opt) => {
                const active = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-mm-pink bg-mm-pink text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-mm-rose"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-mm-ink">
          <input
            type="checkbox"
            checked={analyzeWebsites}
            onChange={(e) => setAnalyzeWebsites(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-mm-pink focus:ring-mm-pink/30"
            disabled={disabled || loading}
          />
          Analyze business websites
          <span className="text-xs text-mm-muted">
            (extracts qualification signals — slower)
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Discovering…" : "Discover opportunities"}
        </button>
      </div>
    </form>
  );
}
