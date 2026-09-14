import { env } from "@/lib/opportunity/env";
import type { DatabaseConnectionStatus } from "@/types/data-insights";

/**
 * Data Insights' database configuration check — read-only status, no real
 * Supabase connection yet. Shares the same optional SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY project-level credentials already documented
 * for CRM persistence (lib/opportunity's own optional Supabase store) —
 * one Supabase project per workspace — but this module does not read or
 * write to it. `connected` is hardcoded false until the real integration
 * ships; even a fully configured environment only reports "configured".
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
}

export function supabaseMissingConfig(): string[] {
  const missing: string[] = [];
  if (!env("SUPABASE_URL")) missing.push("SUPABASE_URL");
  if (!env("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function getDatabaseConnectionStatus(): DatabaseConnectionStatus {
  return {
    configured: isSupabaseConfigured(),
    // Deliberately always false — Data Insights doesn't query a real
    // database yet, regardless of whether credentials are present.
    connected: false,
    missing: supabaseMissingConfig(),
  };
}
