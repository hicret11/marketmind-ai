import type { HistoryItem } from "@/types/ai-studio";

/**
 * Image History is a placeholder for future generated outputs — there's no
 * backend for it yet, so saved prompt drafts live in this browser's
 * localStorage only (per-device, never synced, never sent anywhere). Once
 * real generation exists, this is the seam to swap for a real API-backed
 * store without changing the UI that reads it.
 */

const STORAGE_KEY = "marketmind.ai-studio.history";
const MAX_ITEMS = 50;

function safeRead(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Best-effort only — a full/blocked localStorage should never break the page.
  }
}

export function listHistory(): HistoryItem[] {
  return safeRead().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addHistoryItem(item: HistoryItem): HistoryItem[] {
  const next = [item, ...safeRead()];
  safeWrite(next);
  return next;
}

export function clearHistory(): void {
  safeWrite([]);
}
