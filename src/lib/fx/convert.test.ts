import { expect, test } from "vitest";
import { FALLBACK_RATES } from "./fallback";
import { fromUsdc, toUsdc } from "./convert";
import type { FxRates } from "@/lib/domain/types";

const rates: FxRates = { base: "USD", rates: { ...FALLBACK_RATES, KRW: 1380 }, fetchedAt: "", source: "fallback" };

test("toUsdc floors to 6 dp", () => {
  expect(toUsdc(3_000_000, "KRW", rates)).toBe("2173.913043");
  expect(toUsdc(100, "USD", rates)).toBe("100.000000");
});

test("fromUsdc converts back to local currency", () => {
  expect(fromUsdc("100.000000", "KRW", rates)).toBe(138000);
  expect(fromUsdc("12.5", "USD", rates)).toBe(12.5);
});
