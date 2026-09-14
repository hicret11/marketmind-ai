import {
  DATASET_BUILDER_CATEGORY_GROUPS,
  type BuildTargetOption,
} from "./dataset-builder-groups";
import { detectLeadQualificationEvidenceMismatch } from "./evidence-audit";
import { EvalError } from "./errors";
import { buildLeadQualificationInputFromDiscoveredLead } from "./opportunity-bridge";
import * as repo from "./repository";
import { runDiscoveryPipeline } from "@/lib/opportunity/pipeline";
import { mapWithConcurrency } from "@/lib/opportunity/util";
import type { BenchmarkCase } from "@/types/evaluation";
import type { DiscoveredLead } from "@/types/opportunity";

export {
  DATASET_BUILDER_CATEGORY_GROUPS,
  BUILD_TARGET_OPTIONS,
  DEFAULT_BUILD_TARGET,
  DEFAULT_BUILD_LOCATION,
  type DatasetBuilderCategoryGroup,
  type BuildTargetOption,
} from "./dataset-builder-groups";

/**
 * "Build Evaluation Dataset" — bulk-populates the Lead Qualification dataset
 * with REAL businesses via the existing OpenStreetMap discovery + website
 * analysis pipeline (lib/opportunity/pipeline.ts). No AI, no benchmark model
 * is ever called here — this only reuses the same free, rule-based discovery
 * and scoring Opportunity Discovery already uses. Every case this creates
 * starts as "needs_review" with groundTruth: null — nothing here ever
 * fabricates a Qualified/Not Qualified/Human Verified judgment.
 */

/** How far past the per-category target to search, to survive quality-filter losses. */
const DISCOVERY_BUFFER_MULTIPLIER = 3;
/** Same ceiling the regular Opportunity Discovery form enforces per search. */
const MAX_DISCOVERY_LIMIT = 20;
/**
 * How many category groups' discovery pipelines run at once. This only
 * overlaps independent groups' own work (each group's internal Overpass
 * queries stay sequential, and every Overpass request across the whole app
 * still passes through the single shared rate limiter in overpass.ts) — it
 * does not change Opportunity Discovery's politeness behavior, just lets
 * unrelated groups' website-analysis steps overlap instead of fully
 * serializing 5 categories end to end.
 */
const GROUP_CONCURRENCY = 3;

export interface BuildDatasetParams {
  location: string;
  targetCount: BuildTargetOption;
  /** A follow-up "fill the shortfall" call — only searches these groups again, with a bumped target. */
  fillShortfall?: {
    additionalCount: number;
    fromGroupIds: string[];
  };
}

export interface CategoryBuildOutcome {
  groupId: string;
  label: string;
  target: number;
  added: number;
}

export interface CategoryShortfall {
  groupId: string;
  label: string;
  found: number;
  target: number;
}

export interface BuildDatasetResult {
  requested: number;
  added: number;
  skippedDuplicates: number;
  skippedEvidenceMismatch: number;
  skippedNoWebsite: number;
  skippedInsufficientMetadata: number;
  byCategory: CategoryBuildOutcome[];
  shortfalls: CategoryShortfall[];
  /** Newly created cases, so the reviewer can jump straight into Review Candidates. */
  addedCases: BenchmarkCase[];
}

function hasEnoughMetadata(businessName: string, address: string | null, phone: string | null): boolean {
  // normalizeBusinesses() already drops nameless records; this is a defensive
  // floor for the rare record that's little more than a bare name.
  return businessName.trim().length >= 2 && Boolean(address || phone);
}

export async function buildEvaluationDataset(params: BuildDatasetParams): Promise<BuildDatasetResult> {
  const location = params.location.trim();
  if (!location) throw new EvalError("INVALID_REQUEST", "`location` is required.");

  const groups = params.fillShortfall
    ? DATASET_BUILDER_CATEGORY_GROUPS.filter((g) => params.fillShortfall!.fromGroupIds.includes(g.id))
    : DATASET_BUILDER_CATEGORY_GROUPS;
  if (groups.length === 0) {
    throw new EvalError("INVALID_REQUEST", "No category groups to search.");
  }

  const baseTarget = Math.max(1, Math.floor(params.targetCount / DATASET_BUILDER_CATEGORY_GROUPS.length));
  const extraPerGroup = params.fillShortfall
    ? Math.ceil(params.fillShortfall.additionalCount / groups.length)
    : 0;
  const perGroupTarget = baseTarget + extraPerGroup;

  const dataset = await repo.getOrCreateDefaultDataset("lead-qualification", "Lead Qualification dataset");

  // Phase 1 — discovery + website analysis for every group, overlapped
  // (bounded). This is the slow part; nothing here writes to the dataset yet.
  const discoveryLimit = Math.min(MAX_DISCOVERY_LIMIT, perGroupTarget * DISCOVERY_BUFFER_MULTIPLIER);
  const discoveries = await mapWithConcurrency(groups, GROUP_CONCURRENCY, async (group) => {
    try {
      const discovery = await runDiscoveryPipeline({
        location,
        categories: group.categoryIds,
        limit: discoveryLimit,
        analyzeWebsites: true,
      });
      return { group, leads: discovery.results };
    } catch (error) {
      // One category's discovery failing (e.g. a transient Overpass timeout)
      // shouldn't abort the whole build — it just contributes 0 for that group.
      console.error(`[evaluation] dataset builder: discovery failed for "${group.label}":`, error);
      return { group, leads: [] as DiscoveredLead[] };
    }
  });

  // Phase 2 — filter + persist, sequential (fast, and keeps cross-group
  // dedup/rate-limited file writes race-free).
  let added = 0;
  let skippedDuplicates = 0;
  let skippedEvidenceMismatch = 0;
  let skippedNoWebsite = 0;
  let skippedInsufficientMetadata = 0;
  const byCategory: CategoryBuildOutcome[] = [];
  const shortfalls: CategoryShortfall[] = [];
  const addedCases: BenchmarkCase[] = [];
  const seenBusinessIds = new Set<string>();

  for (const { group, leads } of discoveries) {
    let groupAdded = 0;

    for (const lead of leads) {
      if (groupAdded >= perGroupTarget) break;

      const { business } = lead;

      if (!business.website) {
        skippedNoWebsite += 1;
        continue;
      }
      if (!hasEnoughMetadata(business.name, business.address, business.phone)) {
        skippedInsufficientMetadata += 1;
        continue;
      }
      if (seenBusinessIds.has(business.id)) {
        skippedDuplicates += 1;
        continue;
      }
      const existing = await repo.findCaseBySource(dataset.id, business.id);
      if (existing) {
        seenBusinessIds.add(business.id);
        skippedDuplicates += 1;
        continue;
      }

      const input = buildLeadQualificationInputFromDiscoveredLead(lead);
      const mismatch = detectLeadQualificationEvidenceMismatch(input);
      seenBusinessIds.add(business.id);
      if (mismatch.suspected) {
        skippedEvidenceMismatch += 1;
        continue;
      }

      const record = await repo.createCase({
        datasetId: dataset.id,
        taskId: "lead-qualification",
        label: business.name,
        input,
        groundTruth: null,
        reviewStatus: "needs_review",
        reviewNote: null,
        sourceBusinessId: business.id,
        businessOutcome: null,
        evidenceMismatchAcknowledged: false,
      });
      addedCases.push(record);
      groupAdded += 1;
      added += 1;
    }

    byCategory.push({ groupId: group.id, label: group.label, target: perGroupTarget, added: groupAdded });
    if (groupAdded < perGroupTarget) {
      shortfalls.push({ groupId: group.id, label: group.label, found: groupAdded, target: perGroupTarget });
    }
  }

  return {
    requested: params.fillShortfall ? params.fillShortfall.additionalCount : params.targetCount,
    added,
    skippedDuplicates,
    skippedEvidenceMismatch,
    skippedNoWebsite,
    skippedInsufficientMetadata,
    byCategory,
    shortfalls,
    addedCases,
  };
}
