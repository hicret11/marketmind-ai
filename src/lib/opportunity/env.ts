/**
 * Isolated from config.ts so the `ai/` provider modules can read env vars
 * without importing config.ts (which itself reads AI provider status) —
 * avoids a circular import between config.ts and ai/provider.ts.
 */
export function env(name: string): string {
  return (process.env[name] ?? "").trim();
}
