import { randomBytes } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";

/**
 * Short-lived CSRF `state` values for the Instagram OAuth handshake. Stored
 * server-side (file, not a cookie) so the callback can verify the value it
 * gets back was one we issued, and only once.
 */
interface StateRecord {
  state: string;
  createdAt: string;
}

const TTL_MS = 10 * 60 * 1000;
const store = createJsonArrayStore<StateRecord>("social-oauth-state.json");

export async function issueOAuthState(): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const cutoff = Date.now() - TTL_MS;
  await store.mutate((records) => ({
    items: [
      ...records.filter((r) => new Date(r.createdAt).getTime() > cutoff),
      { state, createdAt: new Date().toISOString() },
    ],
    result: undefined,
  }));
  return state;
}

/** Returns true exactly once for a valid, unexpired state, then consumes it. */
export async function consumeOAuthState(state: string): Promise<boolean> {
  const cutoff = Date.now() - TTL_MS;
  return store.mutate((records) => {
    const match = records.find(
      (r) => r.state === state && new Date(r.createdAt).getTime() > cutoff,
    );
    const remaining = records.filter(
      (r) => r.state !== state && new Date(r.createdAt).getTime() > cutoff,
    );
    return { items: remaining, result: Boolean(match) };
  });
}
