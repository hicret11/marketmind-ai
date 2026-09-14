"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, getDefaultDataset, listCases } from "@/lib/evaluation/client";
import type { BenchmarkCase, ImageInput } from "@/types/evaluation";

/**
 * Framework only, per spec: V1 has no live image generation API call. Cases
 * (prompt/category/constraints) can be created now via the Dataset Manager;
 * importing generated variants + human scoring ships in a later update.
 */
export default function ImageBenchmarkPage() {
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDefaultDataset("image")
      .then((ds) => listCases(ds.datasets[0].id))
      .then((res) => active && setCases(res.cases))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load cases."));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🖼️</span>
          <h1 className="text-2xl font-semibold text-mm-ink">Birthday Image Generation Benchmark</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">
          Framework for comparing birthday-themed image generation sources. V1 imports
          already-generated images for human scoring — no live image API is called yet.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-mm-muted">
        Importing generated image variants and human scoring is not yet available in this build.
        Cases can be prepared now so scoring can start as soon as it ships.
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <span className="text-xs text-mm-muted">
          {cases.length} prompt case{cases.length === 1 ? "" : "s"} prepared
        </span>
        <Link href="/evaluation/datasets" className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white">
          Manage cases
        </Link>
      </div>

      {cases.length > 0 && (
        <ul className="space-y-2">
          {cases.map((c) => {
            const input = c.input as ImageInput;
            return (
              <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 text-xs">
                <p className="font-medium text-mm-ink">{input.prompt}</p>
                <p className="mt-1 text-mm-muted">
                  Category: {input.category}
                  {input.constraints ? ` · ${input.constraints}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
