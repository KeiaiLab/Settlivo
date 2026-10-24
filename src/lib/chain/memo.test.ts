import { expect, test } from "vitest";
import { encodeFunctionData, erc20Abi } from "viem";
import { buildTransferCalldata, decodeMemo, invoiceHash } from "./memo";

const DEAD = "0x000000000000000000000000000000000000dEaD" as const;

test("memo round trip", () => {
  const data = buildTransferCalldata(DEAD, 1_000_000n, { invoiceId: "inv_abc12345", invoiceHash: "ab".repeat(32) });
  expect(data.startsWith("0xa9059cbb")).toBe(true);
  expect(decodeMemo(data)).toEqual({ invoiceId: "inv_abc12345", invoiceHash: "ab".repeat(32) });
});

test("plain transfer has no memo", () => {
  const plain = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [DEAD, 1n] });
  expect(decodeMemo(plain)).toBeNull();
});

test("invoiceHash is stable and order-insensitive", () => {
  const a = invoiceHash({ id: "inv_1", orgId: "org_1", workerId: "wrk_1", amount: 100, currency: "USD", scheduledAt: "2026-10-24T05:00:00.000Z", memo: "Oct" });
  const b = invoiceHash({ memo: "Oct", scheduledAt: "2026-10-24T05:00:00.000Z", currency: "USD", amount: 100, workerId: "wrk_1", orgId: "org_1", id: "inv_1" });
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});
