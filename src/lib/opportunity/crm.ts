import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  PRODUCT_CONTEXT_ID,
  type FitBand,
  type LeadRecord,
  type OpportunityAnalysis,
  type SignalStatus,
} from "@/types/opportunity";
import { env, isSupabaseServerConfigured } from "./config";
import { OpportunityError } from "./errors";
import {
  parseEvidenceList,
  parseOpportunityAnalysis,
  parseVerifiedBusiness,
} from "./validate";
import { shortHash } from "./util";

/**
 * CRM persistence for saved opportunity leads.
 *
 * Two real backends, chosen by configuration:
 *  - SupabaseLeadRepository  (when SUPABASE_URL + a service key are set)
 *  - FileLeadRepository      (default; JSON file under ./.data)
 *
 * There is no in-memory / throwaway store — a saved lead is always persisted
 * somewhere real, and the response says where.
 */

export interface SaveResult {
  lead: LeadRecord;
  deduped: boolean;
}

export interface LeadRepository {
  readonly storage: "supabase" | "file";
  save(record: LeadRecord): Promise<SaveResult>;
  list(): Promise<LeadRecord[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asBand(value: unknown): FitBand {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function asStatus(value: unknown): SignalStatus {
  return value === "detected" || value === "not_detected" || value === "unknown"
    ? value
    : "unknown";
}

/** Builds a LeadRecord from a client save payload. Ids/timestamps are server-set. */
export function buildLeadRecord(body: unknown): LeadRecord {
  if (!isRecord(body)) {
    throw new OpportunityError("INVALID_REQUEST", "Request body must be an object.");
  }

  const business = parseVerifiedBusiness(body.business);

  const fitScoreInput = isRecord(body.fitScore) ? body.fitScore : {};
  const score = Number(fitScoreInput.score);
  const fitScore = {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    band: asBand(fitScoreInput.band),
    dataCompleteness:
      fitScoreInput.dataCompleteness === "full"
        ? ("full" as const)
        : ("partial" as const),
  };

  const signals = Array.isArray(body.signals)
    ? body.signals.filter(isRecord).map((s) => ({
        key: String(s.key ?? ""),
        label: String(s.label ?? ""),
        status: asStatus(s.status),
        confidence: Number.isFinite(Number(s.confidence))
          ? Number(s.confidence)
          : 0,
      }))
    : [];

  const evidence = parseEvidenceList(body.evidence);

  let opportunity: OpportunityAnalysis | null = null;
  if (isRecord(body.opportunity)) {
    // Re-validated with the same guard used for fresh AI output — a client
    // can only echo back what an analyze call already produced, but we still
    // never trust shape/enums blindly.
    opportunity = parseOpportunityAnalysis(body.opportunity);
  }

  const query = isRecord(body.query)
    ? {
        location: String(body.query.location ?? ""),
        categories: Array.isArray(body.query.categories)
          ? body.query.categories.filter(
              (c): c is string => typeof c === "string",
            )
          : [],
        limit: Number(body.query.limit) || 0,
        analyzeWebsites: Boolean(body.query.analyzeWebsites),
      }
    : { location: "", categories: [], limit: 0, analyzeWebsites: false };

  const now = new Date().toISOString();
  return {
    id: `lead_${shortHash(`${business.provider}:${business.sourceId}`)}`,
    createdAt: now,
    updatedAt: now,
    productContextId: PRODUCT_CONTEXT_ID,
    business,
    fitScore,
    signals,
    evidence,
    opportunity,
    discovery: {
      provider: business.provider,
      sourceId: business.sourceId,
      query,
    },
    status: "new",
    stage: "lead",
  };
}

/* -------------------------------------------------------------------------- */
/* File repository                                                             */
/* -------------------------------------------------------------------------- */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "opportunity-leads.json");

let writeChain: Promise<unknown> = Promise.resolve();

class FileLeadRepository implements LeadRepository {
  readonly storage = "file" as const;

  async list(): Promise<LeadRecord[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LeadRecord[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new OpportunityError(
        "CRM_ERROR",
        "Could not read the local leads file.",
        { cause: error },
      );
    }
  }

  async save(record: LeadRecord): Promise<SaveResult> {
    const run = writeChain.then(async () => {
      const leads = await this.list();
      const index = leads.findIndex(
        (l) =>
          l.productContextId === record.productContextId &&
          l.business.provider === record.business.provider &&
          l.business.sourceId === record.business.sourceId,
      );

      let deduped = false;
      let saved: LeadRecord;
      if (index >= 0) {
        deduped = true;
        saved = {
          ...leads[index],
          business: record.business,
          fitScore: record.fitScore,
          signals: record.signals,
          evidence: record.evidence,
          opportunity: record.opportunity ?? leads[index].opportunity,
          discovery: record.discovery,
          updatedAt: record.updatedAt,
        };
        leads[index] = saved;
      } else {
        saved = record;
        leads.unshift(saved);
      }

      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2), "utf8");
      return { lead: saved, deduped };
    });

    writeChain = run.catch(() => undefined);
    return run;
  }
}

/* -------------------------------------------------------------------------- */
/* Supabase repository                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Expected table `opportunity_leads`:
 *   id text primary key, product_context_id text, provider text, source_id text,
 *   record jsonb, created_at timestamptz default now(), updated_at timestamptz,
 *   unique (product_context_id, provider, source_id)
 */
class SupabaseLeadRepository implements LeadRepository {
  readonly storage = "supabase" as const;

  private client() {
    return createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY"),
      { auth: { persistSession: false } },
    );
  }

  async list(): Promise<LeadRecord[]> {
    const { data, error } = await this.client()
      .from("opportunity_leads")
      .select("record")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      throw new OpportunityError("CRM_ERROR", `Supabase: ${error.message}`, {
        cause: error,
      });
    }
    return (data ?? [])
      .map((row) => (row as { record: LeadRecord }).record)
      .filter(Boolean);
  }

  async save(record: LeadRecord): Promise<SaveResult> {
    const client = this.client();

    const { data: existing, error: readError } = await client
      .from("opportunity_leads")
      .select("id, record")
      .eq("product_context_id", record.productContextId)
      .eq("provider", record.business.provider)
      .eq("source_id", record.business.sourceId)
      .maybeSingle();

    if (readError) {
      throw new OpportunityError("CRM_ERROR", `Supabase: ${readError.message}`, {
        cause: readError,
      });
    }

    const deduped = Boolean(existing);
    const previous = (existing as { record?: LeadRecord } | null)?.record;
    const merged: LeadRecord = previous
      ? {
          ...previous,
          business: record.business,
          fitScore: record.fitScore,
          signals: record.signals,
          evidence: record.evidence,
          opportunity: record.opportunity ?? previous.opportunity,
          discovery: record.discovery,
          updatedAt: record.updatedAt,
        }
      : record;

    const { error: writeError } = await client
      .from("opportunity_leads")
      .upsert(
        {
          id: merged.id,
          product_context_id: merged.productContextId,
          provider: merged.business.provider,
          source_id: merged.business.sourceId,
          record: merged,
          updated_at: merged.updatedAt,
        },
        { onConflict: "product_context_id,provider,source_id" },
      );

    if (writeError) {
      throw new OpportunityError("CRM_ERROR", `Supabase: ${writeError.message}`, {
        cause: writeError,
      });
    }

    return { lead: merged, deduped };
  }
}

export function getLeadRepository(): LeadRepository {
  return isSupabaseServerConfigured()
    ? new SupabaseLeadRepository()
    : new FileLeadRepository();
}
