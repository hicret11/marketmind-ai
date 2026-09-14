"use client";

import { useState } from "react";
import { detectLeadQualificationEvidenceMismatch } from "@/lib/evaluation/evidence-audit";
import { canonicalizeUrl } from "@/lib/opportunity/util";
import type {
  BenchmarkCase,
  LeadQualificationGroundTruth,
  LeadQualificationInput,
  QualificationTier,
  WebsiteAnalysisGroundTruth,
  WebsiteAnalysisInput,
} from "@/types/evaluation";

const TIERS: QualificationTier[] = ["strong", "potential", "weak", "not_relevant"];

/**
 * The core human-verification form: shows the reviewer the business/website
 * evidence FIRST (so they can confirm it actually belongs to this business),
 * then Qualified/Not Qualified (+ tier) with a required "why" note. A
 * suspected evidence/domain mismatch blocks verification until explicitly
 * acknowledged.
 */
export function GroundTruthEditor({
  kase,
  onSave,
  onCancel,
  saving,
}: {
  kase: BenchmarkCase;
  onSave: (groundTruth: unknown, note: string, evidenceMismatchAcknowledged: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (kase.taskId === "lead-qualification") {
    return <LeadForm kase={kase} onSave={onSave} onCancel={onCancel} saving={saving} />;
  }
  if (kase.taskId === "website-analysis") {
    return <WebsiteForm kase={kase} onSave={onSave} onCancel={onCancel} saving={saving} />;
  }
  return null;
}

function EvidenceItem({ sourceUrl, text }: { sourceUrl: string; text: string }) {
  return (
    <div className="rounded border border-gray-100 bg-white p-2">
      <p className="truncate font-mono text-[10px] text-mm-muted">{sourceUrl}</p>
      <p className="mt-1 text-[11px] text-gray-700">{text}</p>
    </div>
  );
}

function LeadForm({
  kase,
  onSave,
  onCancel,
  saving,
}: {
  kase: BenchmarkCase;
  onSave: (groundTruth: unknown, note: string, evidenceMismatchAcknowledged: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const input = kase.input as LeadQualificationInput;
  const initial = kase.groundTruth as LeadQualificationGroundTruth | null;
  const [qualified, setQualified] = useState<boolean>(initial?.qualified ?? true);
  const [tier, setTier] = useState<QualificationTier>(initial?.qualification ?? "potential");
  const [note, setNote] = useState(kase.reviewNote ?? "");
  const [acknowledged, setAcknowledged] = useState(kase.evidenceMismatchAcknowledged ?? false);

  const mismatch = detectLeadQualificationEvidenceMismatch(input);
  const websiteDomain = input.website ? (canonicalizeUrl(input.website)?.domain ?? input.website) : null;
  const canSave = note.trim().length > 0 && (!mismatch.suspected || acknowledged);

  return (
    <div className="space-y-3 rounded-lg border border-mm-rose/40 bg-mm-soft-pink/30 p-3">
      {/* Business/evidence preview — shown BEFORE the reviewer can verify, so they
          can confirm this evidence actually belongs to this business. */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold text-mm-ink">{input.businessName}</p>
        <p className="text-[11px] text-mm-muted">
          Website domain: {websiteDomain ?? "no website on record"}
        </p>
        {input.evidence.length === 0 ? (
          <p className="mt-2 text-[11px] text-mm-muted">
            No website evidence extracted for this business — ground truth will rely on the
            verified business fields above only.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            <p className="text-[11px] font-medium text-mm-ink">Evidence snippets</p>
            {input.evidence.map((e) => (
              <EvidenceItem key={e.id} sourceUrl={e.sourceUrl} text={e.text} />
            ))}
          </div>
        )}
      </div>

      {mismatch.suspected && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">⚠ Suspected evidence/domain mismatch</p>
          <p className="mt-1 text-[11px] text-red-700">
            Evidence above cites {mismatch.mismatchedEvidence.map((m) => m.domain).join(", ")}, which
            doesn&apos;t match this business&apos;s recorded website ({mismatch.businessDomain}). This
            can happen when a business&apos;s website has expired or redirects elsewhere. This case is
            excluded from benchmark runs until you confirm below.
          </p>
          <label className="mt-2 flex items-start gap-2 text-[11px] text-red-800">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>I&apos;ve checked the evidence above and confirm it genuinely belongs to {input.businessName}.</span>
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setQualified(true)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${qualified ? "bg-green-600 text-white" : "border border-gray-300 text-gray-600"}`}
        >
          Qualified
        </button>
        <button
          type="button"
          onClick={() => setQualified(false)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${!qualified ? "bg-red-600 text-white" : "border border-gray-300 text-gray-600"}`}
        >
          Not Qualified
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-mm-ink">Strength</label>
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={tier}
          onChange={(e) => setTier(e.target.value as QualificationTier)}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-mm-ink">Why? (required — this becomes the primary ground truth)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => onSave({ qualified, qualification: tier }, note.trim(), acknowledged)}
          className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Mark Human Verified"}
        </button>
      </div>
    </div>
  );
}

function WebsiteForm({
  kase,
  onSave,
  onCancel,
  saving,
}: {
  kase: BenchmarkCase;
  onSave: (groundTruth: unknown, note: string, evidenceMismatchAcknowledged: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const input = kase.input as WebsiteAnalysisInput;
  const initial = kase.groundTruth as WebsiteAnalysisGroundTruth | null;
  const [answer, setAnswer] = useState<boolean>(initial?.answer ?? true);
  const [note, setNote] = useState(kase.reviewNote ?? "");
  const preview = input.websiteText?.trim().slice(0, 500) ?? "";

  return (
    <div className="space-y-3 rounded-lg border border-mm-rose/40 bg-mm-soft-pink/30 p-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold text-mm-ink">{input.businessName}</p>
        <p className="text-[11px] text-mm-muted">Question: {input.question}</p>
        <p className="mt-2 text-[11px] font-medium text-mm-ink">Website text (preview)</p>
        <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-gray-100 bg-white p-2 text-[11px] text-gray-700">
          {preview || "No website text on this case."}
          {input.websiteText && input.websiteText.length > 500 ? "…" : ""}
        </p>
        <p className="mt-1 text-[11px] text-mm-muted">
          Confirm this text is actually from {input.businessName}&apos;s own website before verifying.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAnswer(true)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${answer ? "bg-green-600 text-white" : "border border-gray-300 text-gray-600"}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setAnswer(false)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${!answer ? "bg-red-600 text-white" : "border border-gray-300 text-gray-600"}`}
        >
          No
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-mm-ink">Why? (required)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs">
          Cancel
        </button>
        <button
          type="button"
          disabled={!note.trim() || saving}
          onClick={() => onSave({ answer }, note.trim(), true)}
          className="rounded-full bg-mm-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Mark Human Verified"}
        </button>
      </div>
    </div>
  );
}
