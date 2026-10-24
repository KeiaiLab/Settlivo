import { describe, expect, test } from "vitest";
import type { FxRates } from "@/lib/domain/types";
import { toUsdc } from "./convert";
import { FALLBACK_RATES } from "./fallback";
import { FIXED_FEE_BPS, LOCK_WINDOW_MS, SPREAD_FEE_BPS, estimateUsdc, feeBpsFor, parseRateMode, priceAtIssue, priceAtSettlement } from "./pricing";

const market: FxRates = { base: "USD", rates: { ...FALLBACK_RATES, KRW: 1380 }, fetchedAt: "2026-10-24T05:00:00.000Z", source: "fallback" };
const scheduledAt = "2026-10-24T05:00:00.000Z";
const lockExpiresAt = "2026-10-25T05:00:00.000Z";
const krw = { amount: 3_000_000, currency: "KRW" as const };
const fixedKrw = { ...krw, rateMode: "fixed" as const, feeBps: FIXED_FEE_BPS, lockedRate: 1385, lockExpiresAt };

test('parseRateMode accepts only "fixed" and treats everything else as spread', () => {
  expect(parseRateMode("fixed")).toBe("fixed");
  for (const v of ["spread", "FIXED", "", undefined, null, 1]) expect(parseRateMode(v)).toBe("spread");
});

test("feeBpsFor: 0.5% spread, 1.1% fixed", () => {
  expect(SPREAD_FEE_BPS).toBe(50);
  expect(FIXED_FEE_BPS).toBe(110);
  expect(feeBpsFor("spread")).toBe(SPREAD_FEE_BPS);
  expect(feeBpsFor("fixed")).toBe(FIXED_FEE_BPS);
});

describe("priceAtIssue", () => {
  test("spread records the mode and fee only", () => {
    expect(priceAtIssue("spread", 1385, scheduledAt)).toEqual({ rateMode: "spread", feeBps: 50 });
  });

  test("fixed freezes the quote for 24 h after the scheduled time", () => {
    expect(LOCK_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
    expect(priceAtIssue("fixed", 1385, scheduledAt)).toEqual({ rateMode: "fixed", feeBps: 110, lockedRate: 1385, lockExpiresAt });
  });
});

describe("priceAtSettlement", () => {
  const atMarket = { appliedRate: 1380, usdcAmount: "2173.913043", lockExpired: false };

  test("spread settles at the market rate with a 0.5% fee", () => {
    expect(priceAtSettlement({ ...krw, rateMode: "spread", feeBps: 50 }, market, scheduledAt)).toEqual({ ...atMarket, feeUsdc: "10.869565" });
  });

  test("records without a mode (legacy) price as spread", () => {
    expect(priceAtSettlement(krw, market, scheduledAt)).toEqual({ ...atMarket, feeUsdc: "10.869565" });
  });

  test("fixed settles at the locked rate up to and including lockExpiresAt", () => {
    const expected = { appliedRate: 1385, usdcAmount: toUsdc(krw.amount, "KRW", { ...market, rates: { ...market.rates, KRW: 1385 } }), feeUsdc: "23.826714", lockExpired: false };
    expect(expected.usdcAmount).toBe("2166.064981");
    expect(priceAtSettlement(fixedKrw, market, scheduledAt)).toEqual(expected);
    expect(priceAtSettlement(fixedKrw, market, lockExpiresAt)).toEqual(expected);
  });

  test("fixed after the window falls back to market, keeps the 1.1% fee, and flags the expiry", () => {
    expect(priceAtSettlement(fixedKrw, market, "2026-10-25T05:00:00.001Z")).toEqual({ ...atMarket, feeUsdc: "23.913043", lockExpired: true });
  });

  test("USD converts 1:1 in either mode", () => {
    expect(priceAtSettlement({ amount: 100, currency: "USD", rateMode: "fixed", feeBps: 110, lockedRate: 1, lockExpiresAt }, market, scheduledAt)).toEqual({ appliedRate: 1, usdcAmount: "100.000000", feeUsdc: "1.100000", lockExpired: false });
  });

  test("fee is floored at 6 dp using integer units, not float math", () => {
    // 0.003 × 50 / 10000 = 0.000015 exactly; naive float flooring yields 0.000014.
    expect(priceAtSettlement({ amount: 0.003, currency: "USD", feeBps: 50 }, market, scheduledAt).feeUsdc).toBe("0.000015");
    expect(priceAtSettlement({ amount: 0.019, currency: "USD", feeBps: 110 }, market, scheduledAt).feeUsdc).toBe("0.000209");
    // 2173.913043 × 110 / 10000 = 23.913043473 → floored, not rounded.
    expect(priceAtSettlement({ ...krw, feeBps: 110 }, market, scheduledAt).feeUsdc).toBe("23.913043");
  });
});

describe("estimateUsdc", () => {
  test("mirrors toUsdc flooring and prices the fee for the mode", () => {
    const spread = estimateUsdc(3_000_000, "KRW", 1380, "spread");
    expect(spread.usdc).toBe(Number(toUsdc(3_000_000, "KRW", market)));
    expect(spread.fee).toBeCloseTo(10.869565, 5);
    const fixed = estimateUsdc(3_000_000, "KRW", 1380, "fixed");
    expect(fixed.usdc).toBe(spread.usdc);
    expect(fixed.fee).toBeCloseTo(23.913043, 5);
  });

  test("USD ignores the rate", () => {
    expect(estimateUsdc(250, "USD", 1380, "spread")).toEqual({ usdc: 250, fee: 1.25 });
  });
});
