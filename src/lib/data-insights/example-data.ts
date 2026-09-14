import type { ExampleDashboard } from "@/types/data-insights";

/**
 * Fixed, realistic FICTIONAL business data — used ONLY inside Example Mode
 * (see the "EXAMPLE DATA" badge shown wherever this renders). Never mixed
 * with real MarketMind data, and never returned by any real-data endpoint.
 * Deterministic (not randomized) so the demo looks the same every time.
 */
export function getExampleDashboard(): ExampleDashboard {
  return {
    overview: {
      revenue: 48250,
      orders: 1310,
      customers: 942,
      conversionRate: 0.0318,
      averageOrderValue: 36.8,
      repeatCustomerRate: 0.27,
    },
    trends: {
      revenue: [
        { label: "Week 1", value: 9200 },
        { label: "Week 2", value: 10450 },
        { label: "Week 3", value: 9800 },
        { label: "Week 4", value: 11600 },
        { label: "Week 5", value: 12400 },
      ],
      orders: [
        { label: "Week 1", value: 250 },
        { label: "Week 2", value: 288 },
        { label: "Week 3", value: 264 },
        { label: "Week 4", value: 305 },
        { label: "Week 5", value: 320 },
      ],
      customerGrowth: [
        { label: "Week 1", value: 610 },
        { label: "Week 2", value: 690 },
        { label: "Week 3", value: 745 },
        { label: "Week 4", value: 860 },
        { label: "Week 5", value: 942 },
      ],
      conversionRate: [
        { label: "Week 1", value: 0.028 },
        { label: "Week 2", value: 0.030 },
        { label: "Week 3", value: 0.029 },
        { label: "Week 4", value: 0.033 },
        { label: "Week 5", value: 0.036 },
      ],
    },
    customers: {
      newVsReturning: { newCustomers: 688, returningCustomers: 254 },
      topSegments: [
        { label: "Gift buyers (one-time)", customers: 412 },
        { label: "Repeat celebrators", customers: 254 },
        { label: "Corporate/B2B", customers: 96 },
        { label: "Referral signups", customers: 180 },
      ],
      repeatPurchaseRate: 0.27,
      averageCustomerValue: { newCustomers: 27, returningCustomers: 44 },
    },
    products: {
      best: [
        { name: "Personalized Birthday Song — Standard", revenue: 18200, conversionRate: 0.041 },
        { name: "Personalized Birthday Song — Deluxe Video", revenue: 14300, conversionRate: 0.036 },
        { name: "Gift Bundle (Song + Card)", revenue: 8100, conversionRate: 0.029 },
      ],
      worst: [
        { name: "Corporate Bulk Pack (10+)", revenue: 1400, conversionRate: 0.008 },
        { name: "Instrumental-only Add-on", revenue: 950, conversionRate: 0.011 },
      ],
    },
    attribution: [
      { source: "Instagram", revenue: 19800, customers: 402, conversionRate: 0.034 },
      { source: "TikTok", revenue: 9600, customers: 268, conversionRate: 0.021 },
      { source: "Organic", revenue: 8700, customers: 156, conversionRate: 0.038 },
      { source: "Direct", revenue: 5200, customers: 78, conversionRate: 0.045 },
      { source: "Meta Ads", revenue: 3450, customers: 32, conversionRate: 0.019 },
      { source: "YouTube", revenue: 1500, customers: 6, conversionRate: 0.012 },
    ],
    decisionInsights: [
      {
        finding: "Returning customers have a significantly higher average order value.",
        evidence: ["Returning customers: $44 AOV", "New customers: $27 AOV"],
        businessImpact: "Retention may be more valuable than acquiring additional low-intent traffic.",
        recommendedAction: "Test a birthday reminder / repeat-purchase campaign for past customers.",
        confidence: "high",
      },
      {
        finding: "Instagram drives the most revenue and the highest customer count of any channel.",
        evidence: ["Instagram: $19,800 revenue, 402 customers", "TikTok: $9,600 revenue, 268 customers"],
        businessImpact: "Instagram is currently the primary growth channel by both volume and revenue.",
        recommendedAction: "Prioritize Instagram content investment before scaling TikTok spend.",
        confidence: "medium",
      },
      {
        finding: "Meta Ads has a below-average conversion rate relative to organic and direct traffic.",
        evidence: ["Meta Ads: 1.9% conversion, 32 customers", "Organic: 3.8% conversion", "Direct: 4.5% conversion"],
        businessImpact: "Current paid spend may be reaching lower-intent audiences than organic channels.",
        recommendedAction: "Review Meta Ads targeting and creative before increasing budget.",
        confidence: "medium",
      },
      {
        finding: "The Corporate Bulk Pack has the lowest conversion rate of any product.",
        evidence: ["Corporate Bulk Pack: 0.8% conversion, $1,400 revenue"],
        businessImpact: "This product may be miscategorized, mispriced, or targeting the wrong audience.",
        recommendedAction: "A/B test the product page copy and pricing, or consider sunsetting it.",
        confidence: "low",
      },
    ],
  };
}
