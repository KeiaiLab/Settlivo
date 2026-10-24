import { Redis } from "@upstash/redis";
import { join } from "node:path";
import { FileKv, type KvClient } from "./kv";

export type { KvClient } from "./kv";

let _client: KvClient | null = null;

/** The Vercel Marketplace integration injects KV_REST_API_*; Upstash's own console uses UPSTASH_REDIS_REST_*. */
function upstashCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function kvMode(): "upstash" | "file" {
  const explicit = process.env.KV_MODE;
  if (explicit === "file" || explicit === "upstash") return explicit;
  if (upstashCredentials()) return "upstash";
  if (process.env.VERCEL) {
    throw new Error("Upstash Redis is not configured: connect the Upstash integration (KV_REST_API_URL / KV_REST_API_TOKEN).");
  }
  return "file";
}

/** Lazy, call-time selection: Upstash when configured, otherwise a local JSON file store. */
export function getRedis(): KvClient {
  if (_client) return _client;
  if (kvMode() === "upstash") {
    const creds = upstashCredentials();
    if (!creds) throw new Error("KV_MODE=upstash but no Upstash credentials are set.");
    _client = new Redis(creds) as unknown as KvClient;
  } else {
    const file = process.env.KV_FILE ?? join(process.cwd(), ".data", "kv.json");
    console.info(`[settlivo] Using local file KV store at ${file}`);
    _client = new FileKv(file);
  }
  return _client;
}
