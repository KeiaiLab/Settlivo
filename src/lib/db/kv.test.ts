import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FileKv } from "./kv";

let dir: string;
let kv: FileKv;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "settlivo-kv-"));
  kv = new FileKv(join(dir, "kv.json"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("FileKv", () => {
  test("set/get round-trips JSON values and returns null for missing keys", async () => {
    await kv.set("a", { x: 1, y: ["z"] });
    expect(await kv.get<{ x: number }>("a")).toEqual({ x: 1, y: ["z"] });
    expect(await kv.get("missing")).toBeNull();
    await kv.set("n", 42);
    expect(await kv.get<number>("n")).toBe(42);
  });

  test("mget preserves order and uses null for gaps", async () => {
    await kv.set("k1", "v1");
    await kv.set("k3", "v3");
    expect(await kv.mget<(string | null)[]>("k1", "k2", "k3")).toEqual(["v1", null, "v3"]);
  });

  test("sadd dedupes and smembers returns members", async () => {
    expect(await kv.sadd("s", "a", "b")).toBe(2);
    expect(await kv.sadd("s", "b", "c")).toBe(1);
    expect((await kv.smembers("s")).sort()).toEqual(["a", "b", "c"]);
    expect(await kv.smembers("nope")).toEqual([]);
  });

  test("lpush prepends; lrange is inclusive and supports negative stop; ltrim keeps a window", async () => {
    await kv.lpush("l", "first");
    await kv.lpush("l", "second");
    await kv.lpush("l", "third");
    expect(await kv.lrange<string>("l", 0, 1)).toEqual(["third", "second"]);
    expect(await kv.lrange<string>("l", 0, -1)).toEqual(["third", "second", "first"]);
    await kv.ltrim("l", 0, 1);
    expect(await kv.lrange<string>("l", 0, -1)).toEqual(["third", "second"]);
    expect(await kv.lrange("empty", 0, 10)).toEqual([]);
  });

  test("incr/incrby start from 0 and persist", async () => {
    expect(await kv.incr("c")).toBe(1);
    expect(await kv.incrby("c", 5)).toBe(6);
    expect(await kv.get<number>("c")).toBe(6);
  });

  test("flushdb clears everything", async () => {
    await kv.set("a", 1);
    await kv.sadd("s", "x");
    await kv.flushdb();
    expect(await kv.get("a")).toBeNull();
    expect(await kv.smembers("s")).toEqual([]);
  });

  test("a second instance on the same file sees writes (file is the source of truth)", async () => {
    await kv.set("shared", "yes");
    const other = new FileKv(join(dir, "kv.json"));
    expect(await other.get("shared")).toBe("yes");
  });
});
