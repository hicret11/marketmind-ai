/**
 * Re-export shim. The canonical Sing My Birthday product context now lives at
 * `@/lib/product-context` (shared by Opportunity Discovery and MarketMind
 * Chat/Notes/Handbook). Kept here so existing Opportunity Discovery imports
 * (`./product-context`) keep working unchanged.
 */
export * from "@/lib/product-context";
