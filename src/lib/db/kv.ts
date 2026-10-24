import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * The subset of the Upstash Redis client this app uses. Both `@upstash/redis`'s
 * `Redis` (structurally, via cast in redis.ts) and `FileKv` satisfy it.
 */
export interface KvClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  mget<T extends unknown[] = unknown[]>(...keys: string[]): Promise<T>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<number>;
  lpush(key: string, ...values: unknown[]): Promise<number>;
  lrange<T = string>(key: string, start: number, stop: number): Promise<T[]>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  flushdb(): Promise<unknown>;
}

interface Store {
  kv: Record<string, unknown>;
  sets: Record<string, string[]>;
  lists: Record<string, unknown[]>;
}

const EMPTY: Store = { kv: {}, sets: {}, lists: {} };

/** Redis-style inclusive range with negative indexes. */
function range<T>(arr: T[], start: number, stop: number): T[] {
  const n = arr.length;
  let s = start < 0 ? n + start : start;
  let e = stop < 0 ? n + stop : stop;
  s = Math.max(0, s);
  e = Math.min(n - 1, e);
  if (s > e) return [];
  return arr.slice(s, e + 1);
}

/**
 * JSON-file-backed KV for local development without Upstash. The file is the
 * source of truth: every operation reads it and every write replaces it
 * atomically (tmp + rename), so separate processes/instances stay consistent.
 */
export class FileKv implements KvClient {
  constructor(private readonly file: string) {}

  private read(): Store {
    if (!existsSync(this.file)) return { kv: {}, sets: {}, lists: {} };
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as Partial<Store>;
      return { kv: parsed.kv ?? {}, sets: parsed.sets ?? {}, lists: parsed.lists ?? {} };
    } catch {
      return { kv: {}, sets: {}, lists: {} };
    }
  }

  private write(store: Store) {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(store));
    renameSync(tmp, this.file);
  }

  private mutate<R>(fn: (s: Store) => R): R {
    const s = this.read();
    const r = fn(s);
    this.write(s);
    return r;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const v = this.read().kv[key];
    return v === undefined ? null : (v as T);
  }

  async set(key: string, value: unknown): Promise<"OK"> {
    this.mutate((s) => { s.kv[key] = value; });
    return "OK";
  }

  async mget<T extends unknown[] = unknown[]>(...keys: string[]): Promise<T> {
    const s = this.read();
    return keys.map((k) => (s.kv[k] === undefined ? null : s.kv[k])) as T;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.read().sets[key] ?? [])];
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.mutate((s) => {
      const set = new Set(s.sets[key] ?? []);
      let added = 0;
      for (const m of members) if (!set.has(m)) { set.add(m); added++; }
      s.sets[key] = [...set];
      return added;
    });
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    return this.mutate((s) => {
      const list = s.lists[key] ?? [];
      // LPUSH a b c → c b a (each value goes to the head in order)
      s.lists[key] = [...[...values].reverse(), ...list];
      return s.lists[key].length;
    });
  }

  async lrange<T = string>(key: string, start: number, stop: number): Promise<T[]> {
    return range(this.read().lists[key] ?? [], start, stop) as T[];
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    this.mutate((s) => { s.lists[key] = range(s.lists[key] ?? [], start, stop); });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.mutate((s) => {
      const next = Number(s.kv[key] ?? 0) + increment;
      s.kv[key] = next;
      return next;
    });
  }

  async flushdb(): Promise<"OK"> {
    this.write({ ...EMPTY, kv: {}, sets: {}, lists: {} });
    return "OK";
  }
}
