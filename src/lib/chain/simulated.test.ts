import { beforeEach, expect, test, vi } from "vitest";
import type { Tx } from "@/lib/domain/types";

const store = new Map<string, unknown>();
vi.mock("@/lib/db/redis", () => ({
  getRedis: () => ({
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => { store.set(k, v); return "OK"; },
    incr: async (k: string) => { const n = ((store.get(k) as number) ?? 0) + 1; store.set(k, n); return n; },
    incrby: async (k: string, by: number) => { const n = ((store.get(k) as number) ?? 0) + by; store.set(k, n); return n; },
  }),
}));

import { SimulatedChain } from "./simulated";
import { decodeMemo } from "./memo";

beforeEach(() => { store.clear(); process.env.SIM_CONFIRM_MS = "10"; });

const memo = { invoiceId: "inv_abc12345", invoiceHash: "cd".repeat(32) };

test("transfer returns a pending tx with memo in calldata", async () => {
  const chain = new SimulatedChain();
  const tx = await chain.transfer({ token: "USDC", to: "0x000000000000000000000000000000000000dEaD", amount: "12.500000", memo });
  expect(tx.status).toBe("pending");
  expect(tx.hash).toMatch(/^0x[0-9a-f]{64}$/);
  expect(decodeMemo(tx.calldata)).toEqual(memo);
  expect(tx.explorerUrl).toBe(`/explorer/tx/${tx.hash}`);
});

test("waitForConfirmation confirms and credits the recipient balance", async () => {
  const chain = new SimulatedChain();
  const to = "0x000000000000000000000000000000000000dEaD";
  const tx = await chain.transfer({ token: "USDC", to, amount: "12.500000", memo });
  const done: Tx = await chain.waitForConfirmation(tx.id);
  expect(done.status).toBe("confirmed");
  expect(done.blockNumber).toBeGreaterThan(21_400_000);
  expect(await chain.getBalance(to, "USDC")).toBe("12.500000");
});
