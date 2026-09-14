"use client";

import { useEffect, useState } from "react";
import { ApiError, listModels } from "@/lib/evaluation/client";
import type { ModelRegistryEntry } from "@/types/evaluation";
import { ModelRegistryList } from "@/components/evaluation/model-registry-list";

export default function ModelRegistryPage() {
  const [models, setModels] = useState<ModelRegistryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listModels()
      .then((res) => active && setModels(res.models))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load models."));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🧩</span>
          <h1 className="text-2xl font-semibold text-mm-ink">Model Registry</h1>
        </div>
        <p className="mt-1 text-sm text-mm-muted">
          Six model slots, each independently optional. A model is never hidden here — only ever
          shown as Ready, Not Configured, Model Unavailable, Provider Error, or Rate Limited.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {models ? (
        <ModelRegistryList models={models} />
      ) : (
        !error && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-mm-muted">
            Loading model registry…
          </div>
        )
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-mm-muted">
        Add an API key to your server environment (e.g. <code className="font-mono">GROQ_API_KEY</code>)
        and restart to bring a model to Ready. No model is ever called unless you explicitly select it
        and confirm a benchmark run — see <a className="underline decoration-mm-rose/50 underline-offset-2" href="/evaluation">AI Evaluation Lab</a>.
      </div>
    </div>
  );
}
