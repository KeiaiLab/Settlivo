import { expect, test } from "vitest";
import { canSend, currentPlan, defaultPlan, perTransferFeeUsdc, planFeeUsdc, recordSend, remainingSends, upgrade } from "./plan";

const now = "2026-10-24T05:00:00.000Z";

test("free plan allows 3 sends a month, paid plans are unlimited", () => {
  let p = defaultPlan(now);
  expect(p).toEqual({ tier: "free", renewsAt: "2026-11-01T00:00:00.000Z", sendsThisMonth: 0 });
  p = recordSend(recordSend(recordSend(p)));
  expect(remainingSends(p)).toBe(0);
  expect(canSend(p)).toBe(false);
  const biz = upgrade(p, "business", now);
  expect(canSend(biz)).toBe(true);
  expect(remainingSends(biz)).toBeNull();
  expect(biz.renewsAt).toBe("2026-11-23T05:00:00.000Z");
});

test("a lapsed period renews with a fresh counter; legacy accounts are Free", () => {
  const stale = { tier: "free" as const, renewsAt: "2026-10-01T00:00:00.000Z", sendsThisMonth: 3 };
  expect(currentPlan(stale, now)).toEqual({ tier: "free", renewsAt: "2026-11-01T00:00:00.000Z", sendsThisMonth: 0 });
  expect(currentPlan(undefined, now).tier).toBe("free");
});

test("plan fee: Free pays per transfer, paid tiers only the fixed-rate premium", () => {
  expect(planFeeUsdc("free", "spread", "1000.000000")).toBe("5.000000");
  expect(planFeeUsdc("free", "fixed", "1000.000000")).toBe("11.000000");
  expect(planFeeUsdc("business", "spread", "1000.000000")).toBe("0.000000");
  expect(planFeeUsdc("business", "fixed", "1000.000000")).toBe("6.000000");
  expect(perTransferFeeUsdc([{ usdcAmount: "1000.000000" }, { usdcAmount: "200.000000", rateMode: "fixed" }, {}])).toBe("7.200000");
});
