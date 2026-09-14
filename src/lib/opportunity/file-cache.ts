import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * A tiny JSON-file-backed TTL cache. Used to avoid re-hitting shared public
 * infrastructure (Nominatim geocoding, Overpass queries) for repeated
 * requests — good citizenship for free, shared services.
 *
 * Not for anything security-sensitive: it's a local dev-friendly cache, not a
 * distributed store.
 */
export interface FileCache<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs: number): Promise<void>;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export function createFileCache<T>(fileName: string): FileCache<T> {
  const filePath = path.join(process.cwd(), ".data", fileName);
  let mem: Map<string, Entry<T>> | null = null;
  let writeChain: Promise<unknown> = Promise.resolve();

  async function load(): Promise<Map<string, Entry<T>>> {
    if (mem) return mem;
    mem = new Map();
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Array<[string, Entry<T>]>;
      for (const [key, entry] of parsed) mem.set(key, entry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[file-cache] could not read ${fileName}:`, error);
      }
    }
    return mem;
  }

  async function persist(): Promise<void> {
    const m = await load();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(Array.from(m.entries())), "utf8");
  }

  return {
    async get(key) {
      const m = await load();
      const hit = m.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt < Date.now()) {
        m.delete(key);
        return undefined;
      }
      return hit.value;
    },
    async set(key, value, ttlMs) {
      const m = await load();
      m.set(key, { value, expiresAt: Date.now() + ttlMs });
      writeChain = writeChain.then(() => persist()).catch((error) => {
        console.warn(`[file-cache] could not write ${fileName}:`, error);
      });
      await writeChain;
    },
  };
}
