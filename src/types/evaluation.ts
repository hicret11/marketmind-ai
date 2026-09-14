/**
 * AI Evaluation Lab — model benchmarking & AI quality testing.
 *
 * Core principle: the question is never "which model is best", it's "which
 * model performs best for THIS real MarketMind/Sing My Birthday task". No
 * benchmark result is ever fabricated — every number here traces back to a
 * stored BenchmarkRun / ModelCaseResult / HumanReview.
 */

/** The six visible model slots (see lib/evaluation/providers/registry.ts). */
export type BenchmarkModelId =
  | "gemini"
  | "gpt-oss"
  | "qwen"
  | "nemotron"
  | "gpt"
  | "claude";

export type BenchmarkProviderName =
  | "Google"
  | "Groq"
  | "OpenRouter"
  | "OpenAI"
  | "Anthropic";

export type ModelStatus =
  | "ready"
  | "not_configured"
  | "model_unavailable"
  | "provider_error"
  | "rate_limited";

export interface ModelRegistryEntry {
  id: BenchmarkModelId;
  displayName: string;
  provider: BenchmarkProviderName;
  /** The model id MarketMind will request — never a secret. */
  requestedModelId: string;
  status: ModelStatus;
  /** Why status isn't "ready" (e.g. which env var is missing), when applicable. */
  statusDetail: string | null;
  freeTierNote: string | null;
}

/** The five benchmark tasks. */
export type BenchmarkTaskId =
  | "lead-qualification"
  | "website-analysis"
  | "lyrics"
  | "content"
  | "image";

export type BenchmarkEvaluationMode = "classification" | "human-eval";

export interface BenchmarkTaskDefinition {
  id: BenchmarkTaskId;
  title: string;
  shortTitle: string;
  description: string;
  evaluationMode: BenchmarkEvaluationMode;
  /** Current prompt/task version key, e.g. "lead-qualification-v1". */
  promptVersion: string;
  route: string;
}

/* -------------------------------------------------------------------------- */
/* Datasets & cases                                                            */
/* -------------------------------------------------------------------------- */

export type ReviewStatus = "human_verified" | "needs_review";

export interface BenchmarkDataset {
  id: string;
  taskId: BenchmarkTaskId;
  name: string;
  /** Increments on every case add/edit/remove. */
  version: number;
  /** Hash of the case set's ids + content — changes whenever cases change. */
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

/** Task-specific input/groundTruth payloads are `unknown` at this level and
 * narrowed per task (see lib/evaluation/tasks/*.ts) — keeps the dataset/case
 * repository generic across all five benchmarks. */
export interface BenchmarkCase {
  id: string;
  datasetId: string;
  taskId: BenchmarkTaskId;
  /** Short label shown in lists (business name, character name, etc.). */
  label: string;
  input: unknown;
  groundTruth: unknown;
  reviewStatus: ReviewStatus;
  /** Human reviewer's note — required context for the "why" behind ground truth. */
  reviewNote: string | null;
  /** Optional link back to the Opportunity Discovery business this came from. */
  sourceBusinessId: string | null;
  /** Prepared for later — NOT ground truth (see task spec §27). */
  businessOutcome: BusinessOutcome | null;
  /**
   * A human reviewer has explicitly confirmed that this case's evidence
   * (e.g. website snippets) genuinely belongs to this business, after being
   * shown a suspected domain/evidence mismatch. Defaults to false; only
   * meaningful when a mismatch was detected (see lib/evaluation/evidence-audit.ts)
   * — a case with no suspected mismatch runs normally regardless of this flag.
   * Old records without this field read as `undefined`, which every check
   * below treats the same as `false` (never auto-acknowledged).
   */
  evidenceMismatchAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Future real-world outcome tracking — informational only, never auto-derived. */
export interface BusinessOutcome {
  contacted: boolean;
  replied: boolean;
  meeting: boolean;
  converted: boolean;
  notInterested: boolean;
  noResponse: boolean;
  note: string | null;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Lead Qualification (flagship classification benchmark)                      */
/* -------------------------------------------------------------------------- */

export type QualificationTier = "strong" | "potential" | "weak" | "not_relevant";

export interface LeadQualificationInput {
  businessName: string;
  category: string | null;
  address: string | null;
  website: string | null;
  matchedCategories: string[];
  /** Rule-extracted signals from Opportunity Discovery — the SAME package for every model. */
  signals: Array<{
    key: string;
    label: string;
    status: string;
    confidence: number;
    matchedTerms: string[];
  }>;
  evidence: Array<{ id: string; sourceUrl: string; matchedTerm: string; text: string }>;
  /** MarketMind's existing transparent score — reference only, not fed as an answer. */
  referenceFitScore: { score: number; band: string } | null;
}

export interface LeadQualificationGroundTruth {
  qualified: boolean;
  qualification: QualificationTier;
}

export interface LeadQualificationModelOutput {
  qualified: boolean;
  qualification: QualificationTier;
  confidence: "high" | "medium" | "low";
  reason: string;
  /** Empty string = model expressed no uncertainty. */
  uncertainty: string;
}

/* -------------------------------------------------------------------------- */
/* Website Analysis (secondary classification benchmark, reuses the same engine) */
/* -------------------------------------------------------------------------- */

export interface WebsiteAnalysisInput {
  businessName: string;
  websiteText: string;
  question: string;
}

export interface WebsiteAnalysisGroundTruth {
  answer: boolean;
}

export interface WebsiteAnalysisModelOutput {
  answer: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  uncertainty: string;
}

/* -------------------------------------------------------------------------- */
/* Lyrics & Content (human-eval benchmarks)                                    */
/* -------------------------------------------------------------------------- */

export interface LyricsInput {
  name: string;
  age: string | null;
  relationship: string | null;
  personality: string | null;
  memory: string | null;
  language: string;
  genre: string;
  otherNotes: string | null;
}

export interface ContentInput {
  platform: string;
  goal: string;
  audience: string;
  contentType: string;
  brandVoice: string;
  requiredCta: string | null;
}

/** Human-eval tasks have no "ground truth" — this stays null; scoring is via HumanReview. */
export type NoGroundTruth = null;

export const LYRICS_SCORE_DIMENSIONS = [
  "personalization",
  "emotionalQuality",
  "birthdayRelevance",
  "instructionFollowing",
  "correctUseOfDetails",
  "noInventedFacts",
  "naturalLanguage",
  "overall",
] as const;
export type LyricsScoreDimension = (typeof LYRICS_SCORE_DIMENSIONS)[number];

export const CONTENT_SCORE_DIMENSIONS = [
  "brandFit",
  "originality",
  "ctaQuality",
  "emotionalFit",
  "platformFit",
  "instructionFollowing",
  "overall",
] as const;
export type ContentScoreDimension = (typeof CONTENT_SCORE_DIMENSIONS)[number];

export const IMAGE_SCORE_DIMENSIONS = [
  "promptAdherence",
  "birthdayRelevance",
  "visualQuality",
  "noFaceCompliance",
  "slideshowUsability",
  "composition",
  "overall",
] as const;
export type ImageScoreDimension = (typeof IMAGE_SCORE_DIMENSIONS)[number];

export type ImageCategory =
  | "balloons"
  | "cake"
  | "flowers"
  | "pets"
  | "romantic"
  | "sunset";

export interface ImageInput {
  prompt: string;
  category: ImageCategory;
  constraints: string | null;
}

/** V1 has no live image generation — a variant is an already-generated image the user imports. */
export interface ImageVariant {
  id: string;
  /** Free-text source label standing in for "model" — e.g. "Sing My Birthday LoRA v1", "Baseline SDXL". */
  sourceLabel: string;
  imageUrl: string;
  importedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Benchmark runs                                                              */
/* -------------------------------------------------------------------------- */

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface BenchmarkRun {
  id: string;
  taskId: BenchmarkTaskId;
  datasetId: string;
  datasetVersion: number;
  datasetFingerprint: string;
  promptVersion: string;
  modelIds: BenchmarkModelId[];
  status: RunStatus;
  progress: { completed: number; total: number };
  isBaseline: boolean;
  startedAt: string;
  finishedAt: string | null;
  /** Only meaningful for classification-mode tasks. */
  metrics: Record<BenchmarkModelId, MetricResult> | null;
  error: string | null;
}

/**
 * "excluded" — the case was deliberately never sent to the model, because its
 * evidence had a suspected domain/business mismatch that hasn't been reviewed
 * and acknowledged yet (see lib/evaluation/evidence-audit.ts). Distinct from
 * "error": nothing failed, the call was intentionally skipped to protect
 * result quality and avoid spending API budget on untrustworthy input.
 */
export type ModelCaseStatus = "ok" | "error" | "invalid_output" | "timeout" | "excluded";

export interface ModelCaseResult {
  id: string;
  runId: string;
  taskId: BenchmarkTaskId;
  caseId: string;
  modelId: BenchmarkModelId;
  provider: BenchmarkProviderName;
  requestedModelId: string;
  /** The model id the provider actually reports back, when it does. Null if unavailable. */
  actualModelId: string | null;
  /** True when actualModelId is known and differs from requestedModelId. */
  modelMismatch: boolean;
  status: ModelCaseStatus;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  /** Raw text returned by the model, truncated for storage. */
  rawOutputSnippet: string | null;
  /** Parsed + validated structured output (classification tasks) or generated text (human-eval tasks). */
  output: unknown;
  /** Classification tasks only: the model's boolean prediction, normalized (qualified / answer). */
  predictedPositive: boolean | null;
  /** Classification tasks only: ground truth, normalized to the same boolean axis. */
  actualPositive: boolean | null;
  /** For classification tasks: was the prediction correct vs. ground truth? Null if no ground truth. */
  correct: boolean | null;
  /** Correct / flagged-uncertain / silent-failure — see lib/evaluation/metrics/silent-failure.ts. */
  silentFailureCategory: "correct" | "incorrect_flagged" | "incorrect_silent" | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface MetricResult {
  modelId: BenchmarkModelId;
  casesEvaluated: number;
  casesWithGroundTruth: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  silentErrorRate: number | null;
  avgLatencyMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number | null;
  apiErrors: number;
  timeouts: number;
  invalidOutputs: number;
  /** Cases never sent to the model due to a suspected, unreviewed evidence/domain mismatch. */
  excludedCases: number;
}

/* -------------------------------------------------------------------------- */
/* Human evaluation (lyrics / content / image)                                 */
/* -------------------------------------------------------------------------- */

export interface HumanReview {
  id: string;
  runId: string | null;
  taskId: BenchmarkTaskId;
  caseId: string;
  /** For lyrics/content: the ModelCaseResult being scored. For images: an ImageVariant id. */
  subjectId: string;
  subjectLabel: string;
  scores: Record<string, number>;
  note: string | null;
  reviewerName: string | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                      */
/* -------------------------------------------------------------------------- */

export interface ModelPricingEntry {
  modelId: BenchmarkModelId;
  /** USD per 1,000,000 input tokens. */
  inputPricePerMTok: number;
  /** USD per 1,000,000 output tokens. */
  outputPricePerMTok: number;
  unit: "per_1m_tokens";
  note: string;
  effectiveDate: string;
}

/* -------------------------------------------------------------------------- */
/* Regression                                                                   */
/* -------------------------------------------------------------------------- */

export interface RegressionThresholds {
  maxAccuracyDropPct: number;
  maxFalsePositiveRateIncreasePct: number;
}

export interface RegressionFinding {
  modelId: BenchmarkModelId;
  metric: "accuracy" | "falsePositiveRate";
  baselineValue: number;
  currentValue: number;
  deltaPct: number;
  regressed: boolean;
}

/* -------------------------------------------------------------------------- */
/* Priority-weighted recommendation (transparent, never a secret formula)      */
/* -------------------------------------------------------------------------- */

export interface RecommendationPriorities {
  accuracy: "low" | "medium" | "high";
  falsePositive: "low" | "medium" | "high";
  cost: "low" | "medium" | "high";
  latency: "low" | "medium" | "high";
}

export interface Recommendation {
  modelId: BenchmarkModelId;
  reason: string;
  weights: RecommendationPriorities;
}
