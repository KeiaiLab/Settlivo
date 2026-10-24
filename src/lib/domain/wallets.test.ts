import { expect, test } from "vitest";
import type { Wallet } from "./types";
import { defaultWallet, isAddress, markDefault, platformAddress } from "./wallets";

const w = (id: string, isDefault = false, status: Wallet["status"] = "active"): Wallet => ({
  id, owner: { type: "worker", id: "wrk_t" }, label: id, address: platformAddress(id), token: "USDC", kind: "platform", status, isDefault, createdAt: "2026-10-01T00:00:00.000Z",
});

test("platform addresses are deterministic 20-byte hex", () => {
  expect(platformAddress("wrk_alice")).toBe(platformAddress("wrk_alice"));
  expect(isAddress(platformAddress("x"))).toBe(true);
  expect(platformAddress("a")).not.toBe(platformAddress("b"));
});

test("defaultWallet prefers the flagged active wallet", () => {
  expect(defaultWallet([w("a"), w("b", true)])?.id).toBe("b");
  expect(defaultWallet([w("a"), w("b", true, "revoked")])?.id).toBe("a");
  expect(defaultWallet([])).toBeUndefined();
  expect(markDefault([w("a", true), w("b")], "b").map((x) => x.isDefault)).toEqual([false, true]);
});
