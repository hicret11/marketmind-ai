import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * A tiny JSON-array file store under ./.data — the same shape of persistence
 * Opportunity Discovery's CRM already uses, generalized for reuse by Notes and
 * Chat. Writes are serialized per store so concurrent requests can't clobber
 * each other. Meant to be swapped for a real database later; callers only
 * depend on `list()`/`writeAll()`.
 */
export interface JsonArrayStore<T> {
  list(): Promise<T[]>;
  writeAll(items: T[]): Promise<void>;
  /** Reads, lets `mutate` change the array, then writes — serialized. */
  mutate<R>(mutate: (items: T[]) => { items: T[]; result: R }): Promise<R>;
}

export function createJsonArrayStore<T>(fileName: string): JsonArrayStore<T> {
  const dataDir = path.join(process.cwd(), ".data");
  const filePath = path.join(dataDir, fileName);
  let writeChain: Promise<unknown> = Promise.resolve();

  async function list(): Promise<T[]> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async function writeAll(items: T[]): Promise<void> {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
  }

  function mutate<R>(mutator: (items: T[]) => { items: T[]; result: R }): Promise<R> {
    const run = writeChain.then(async () => {
      const current = await list();
      const { items, result } = mutator(current);
      await writeAll(items);
      return result;
    });
    writeChain = run.catch(() => undefined);
    return run;
  }

  return { list, writeAll, mutate };
}
