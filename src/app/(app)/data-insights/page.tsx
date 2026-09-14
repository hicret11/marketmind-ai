"use client";

import { useEffect, useState } from "react";
import { ExampleDashboard } from "@/components/data-insights/example-dashboard";
import { ConnectDatabasePanel } from "@/components/data-insights/connect-database-panel";
import type { DatabaseConnectionStatus } from "@/types/data-insights";

type View = "default" | "example";

export default function DataInsightsPage() {
  const [status, setStatus] = useState<DatabaseConnectionStatus | null>(null);
  const [view, setView] = useState<View>("default");
  const [showConnectPanel, setShowConnectPanel] = useState(false);

  useEffect(() => {
    fetch("/api/data-insights/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false, missing: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mm-ink">Data Insights</h1>
          <p className="mt-1 text-sm text-mm-muted">
            {view === "example"
              ? "A preview of how Data Insights will look once your real database is connected."
              : "Connect your business database to turn raw data into actionable decisions."}
          </p>
        </div>
        {view === "example" && (
          <button
            type="button"
            onClick={() => setView("default")}
            className="shrink-0 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
          >
            Exit Example Mode
          </button>
        )}
      </header>

      {view === "default" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <div className="text-4xl" aria-hidden>
            🧮
          </div>
          <h2 className="mt-4 text-lg font-semibold text-mm-ink">Database not connected</h2>
          <p className="mt-2 max-w-sm text-sm text-mm-muted">
            Connect your business database to turn raw data into actionable decisions.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setShowConnectPanel(true)}
              className="rounded-full bg-gradient-to-r from-mm-pink to-mm-dark-rose px-4 py-2 text-sm font-semibold text-white"
            >
              Connect Database
            </button>
            <button
              type="button"
              onClick={() => setView("example")}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              View Example
            </button>
          </div>
          {status && (
            <p className="mt-4 text-[11px] text-mm-muted">
              Supabase: {status.configured ? "Configured, not yet connected" : "Not configured"}
            </p>
          )}
        </div>
      )}

      {view === "example" && <ExampleDashboard />}

      {showConnectPanel && status && (
        <ConnectDatabasePanel status={status} onClose={() => setShowConnectPanel(false)} />
      )}
    </div>
  );
}
