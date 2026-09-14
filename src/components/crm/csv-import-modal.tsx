"use client";

import { useRef, useState } from "react";
import { ApiError, commitCsvImport, previewCsvImport } from "@/lib/crm/client";
import type { CsvImportPreview, CsvRowDecision } from "@/types/crm";

type Phase = "setup" | "preview" | "done";

const SOURCE_SUGGESTIONS = ["CSV - UK", "CSV - Dubai"];

export function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [csvText, setCsvText] = useState("");
  const [source, setSource] = useState("CSV - UK");
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [decisions, setDecisions] = useState<Record<number, CsvRowDecision>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; merged: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csvText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await previewCsvImport(csvText, source.trim() || "CSV");
      setPreview(res.preview);
      const defaults: Record<number, CsvRowDecision> = {};
      for (const row of res.preview.rows) {
        defaults[row.rowNumber] = !row.valid ? "skip" : row.duplicateOfLeadId ? "skip" : "import";
      }
      setDecisions(defaults);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not read this CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const rows = preview.rows.map((candidate) => ({
        candidate,
        decision: decisions[candidate.rowNumber] ?? "skip",
      }));
      const res = await commitCsvImport(preview.source, rows);
      setResult({ imported: res.imported, skipped: res.skipped, merged: res.merged });
      setPhase("done");
      onImported();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not import these leads.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 sm:py-14" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-mm-ink">Import CSV</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          {phase === "setup" && (
            <div className="space-y-4">
              <p className="text-xs text-mm-muted">
                Flexible column mapping — headers like company/business_name, website, email, phone/mobile,
                category/industry, city, country, contact_name/decision_maker and role/notes are all
                recognized automatically.
              </p>

              <div>
                <label className="block text-xs font-medium text-mm-ink">Label this import</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  list="crm-source-suggestions"
                  placeholder="CSV - UK"
                />
                <datalist id="crm-source-suggestions">
                  {SOURCE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-mm-ink">CSV file</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className="mt-1 block w-full text-xs"
                />
                <p className="mt-1 text-[11px] text-mm-muted">or paste CSV content below</p>
                <textarea
                  className="mt-1 min-h-40 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="company,website,email,phone,category,city,country,contact_name,role,notes"
                />
              </div>

              <button
                type="button"
                disabled={!csvText.trim() || loading}
                onClick={handlePreview}
                className="rounded-full bg-mm-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Reading…" : "Preview import"}
              </button>
            </div>
          )}

          {phase === "preview" && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="CSV rows found" value={preview.rowsFound} />
                <Stat label="Valid leads" value={preview.validCount} accent="text-green-700" />
                <Stat label="Missing website" value={preview.missingWebsiteCount} accent="text-amber-700" />
                <Stat label="Duplicate leads" value={preview.duplicateCount} accent="text-red-700" />
              </div>

              {preview.unmappedColumns.length > 0 && (
                <p className="text-[11px] text-mm-muted">
                  Not mapped to a known field (kept unused, nothing discarded silently):{" "}
                  {preview.unmappedColumns.join(", ")}.
                </p>
              )}

              <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-[10px] uppercase text-mm-muted">
                      <th className="px-2 py-1.5">Row</th>
                      <th className="px-2 py-1.5">Business</th>
                      <th className="px-2 py-1.5">Website</th>
                      <th className="px-2 py-1.5">Issues</th>
                      <th className="px-2 py-1.5">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-mm-muted">{row.rowNumber}</td>
                        <td className="px-2 py-1.5 text-mm-ink">{row.businessName ?? "—"}</td>
                        <td className="px-2 py-1.5 text-mm-muted">{row.website ?? "Not available"}</td>
                        <td className="px-2 py-1.5">
                          {row.issues.map((i) => (
                            <span key={i} className="mr-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700">
                              {i}
                            </span>
                          ))}
                          {row.duplicateOfLeadId && (
                            <span className="mr-1 rounded-full bg-red-50 px-1.5 py-0.5 text-red-700">
                              Possible duplicate — {row.duplicateReason}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            disabled={!row.valid}
                            className="rounded border border-gray-300 px-1 py-0.5 text-[11px] disabled:opacity-50"
                            value={decisions[row.rowNumber] ?? "skip"}
                            onChange={(e) =>
                              setDecisions((prev) => ({ ...prev, [row.rowNumber]: e.target.value as CsvRowDecision }))
                            }
                          >
                            <option value="import">Import anyway</option>
                            {row.duplicateOfLeadId && <option value="merge">Merge</option>}
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPhase("setup")} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCommit}
                  className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Importing…" : "Import Leads"}
                </button>
              </div>
            </div>
          )}

          {phase === "done" && result && (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-mm-ink">Import complete</p>
              <p className="mt-1 text-xs text-mm-muted">
                {result.imported} imported · {result.merged} merged · {result.skipped} skipped
              </p>
              <button type="button" onClick={onClose} className="mt-4 rounded-full bg-mm-pink px-4 py-2 text-xs font-semibold text-white">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-center">
      <p className={`text-base font-semibold ${accent ?? "text-mm-ink"}`}>{value}</p>
      <p className="text-[10px] text-mm-muted">{label}</p>
    </div>
  );
}
