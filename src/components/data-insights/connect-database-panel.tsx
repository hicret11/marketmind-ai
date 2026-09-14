import type { DatabaseConnectionStatus } from "@/types/data-insights";

/**
 * "Connect Database" opens this — an honest coming-soon explanation, never
 * a real credential form. Supabase integration isn't wired up yet; this
 * never asks for or accepts SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from
 * the browser — those stay server-only .env values for later.
 */
export function ConnectDatabasePanel({ status, onClose }: { status: DatabaseConnectionStatus; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-mm-ink">Connect Database</p>
          <button type="button" onClick={onClose} className="text-xs text-mm-muted hover:text-mm-ink">
            Close
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              status.configured ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            Supabase: {status.configured ? "Configured, not yet connected" : "Not configured"}
          </span>
        </div>

        <p className="mt-3 text-sm text-mm-muted">
          Data Insights will connect to your Supabase project so MarketMind can turn your real business tables into
          metrics, trends, and evidence-backed recommendations — the same way it already does for your synced
          Instagram, CRM, and Opportunity data.
        </p>

        <p className="mt-3 text-xs text-mm-muted">This isn&apos;t available yet. When it ships, it will:</p>
        <ul className="mt-1.5 list-inside list-disc text-xs text-mm-muted">
          <li>Read only tables you explicitly approve — never your whole database.</li>
          <li>Use fixed, server-side query functions — MarketMind AI never runs arbitrary SQL.</li>
          <li>Keep credentials server-side only, never sent to your browser.</li>
          <li>
            Use <code className="rounded bg-gray-100 px-1">SUPABASE_URL</code> and{" "}
            <code className="rounded bg-gray-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> as server environment
            variables — not entered here.
          </li>
        </ul>

        <p className="mt-3 text-xs text-mm-muted">
          For now, click <span className="font-semibold text-mm-ink">View Example</span> to see how the finished
          dashboard will look with fictional data.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-mm-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
