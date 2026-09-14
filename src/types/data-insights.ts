/**
 * Data Insights — future database intelligence module.
 *
 * NOT connected to Supabase yet (per the current task). Everything here is
 * either (a) the real, working "no database yet" status/example-mode
 * surface, or (b) typed architecture for the LATER real integration —
 * shapes only, no live queries.
 *
 * Hard rule for the eventual real integration: the AI NEVER executes
 * arbitrary SQL. It can only call a fixed set of pre-approved, server-side
 * query functions (see ApprovedQueryName) — every one of them parameterized
 * and validated in code, the same "validated, never trusted blindly"
 * discipline used everywhere else in MarketMind. Credentials
 * (SUPABASE_SERVICE_ROLE_KEY) stay server-side only, never sent to the
 * browser.
 */

export interface DatabaseConnectionStatus {
  /** Whether SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present in the environment. */
  configured: boolean;
  /** Always false today — real queries aren't implemented yet, even if credentials exist. */
  connected: boolean;
  missing: string[];
}

/* -------------------------------------------------------------------------- */
/* Future real query surface — types only, nothing calls a database yet.      */
/* -------------------------------------------------------------------------- */

/**
 * The ONLY operations the AI (or any Data Insights code) will ever be
 * allowed to invoke against a connected database — a fixed, named,
 * server-validated set. There is deliberately no "run this SQL" member.
 */
export type ApprovedQueryName =
  | "aggregate_metric" // e.g. sum(revenue) grouped by day/week/month, for an approved table+column
  | "compare_periods" // same aggregate_metric shape, over two date ranges
  | "detect_trend" // slope/direction of a metric series over time
  | "detect_anomaly" // points in a metric series outside its normal range
  | "find_correlation" // real statistical correlation between two approved metrics
  | "top_n_breakdown"; // top/bottom N categories of an approved dimension by an approved metric

export interface ApprovedQueryRequest {
  query: ApprovedQueryName;
  /** Must be in the workspace's own approved-table allowlist — never arbitrary. */
  table: string;
  /** Must be in that table's approved-column allowlist. */
  metric?: string;
  dimension?: string;
  dateRange?: { since: string; until: string };
  compareToDateRange?: { since: string; until: string };
}

/* -------------------------------------------------------------------------- */
/* Decision Intelligence — evidence-backed answers, real mode only            */
/* -------------------------------------------------------------------------- */

export type InsightConfidence = "low" | "medium" | "high";

export interface DecisionInsight {
  finding: string;
  evidence: string[];
  businessImpact: string;
  recommendedAction: string;
  confidence: InsightConfidence;
}

/** The four standing questions Decision Intelligence answers once real data exists — never unsupported. */
export const DECISION_INTELLIGENCE_QUESTIONS = [
  "What changed?",
  "Why might it have changed?",
  "What matters most?",
  "What should we do next?",
  "What should we monitor?",
] as const;

/* -------------------------------------------------------------------------- */
/* Example-mode dashboard shape (fictional data only — never mixed with real) */
/* -------------------------------------------------------------------------- */

export interface ExampleOverviewMetrics {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number;
  averageOrderValue: number;
  repeatCustomerRate: number;
}

export interface ExampleTrendPoint {
  label: string; // e.g. "Week 1"
  value: number;
}

export interface ExampleTrends {
  revenue: ExampleTrendPoint[];
  orders: ExampleTrendPoint[];
  customerGrowth: ExampleTrendPoint[];
  conversionRate: ExampleTrendPoint[];
}

export interface ExampleCustomerInsights {
  newVsReturning: { newCustomers: number; returningCustomers: number };
  topSegments: Array<{ label: string; customers: number }>;
  repeatPurchaseRate: number;
  averageCustomerValue: { newCustomers: number; returningCustomers: number };
}

export interface ExampleProductRow {
  name: string;
  revenue: number;
  conversionRate: number;
}

export interface ExampleProductInsights {
  best: ExampleProductRow[];
  worst: ExampleProductRow[];
}

export interface ExampleAttributionRow {
  source: "Instagram" | "TikTok" | "YouTube" | "Meta Ads" | "Organic" | "Direct";
  revenue: number;
  customers: number;
  conversionRate: number;
}

export interface ExampleDashboard {
  overview: ExampleOverviewMetrics;
  trends: ExampleTrends;
  customers: ExampleCustomerInsights;
  products: ExampleProductInsights;
  attribution: ExampleAttributionRow[];
  decisionInsights: DecisionInsight[];
}
