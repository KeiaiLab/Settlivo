import { expect, test } from "vitest";
import { computeDelayMs } from "./delay";

test("computeDelayMs clamps past dates to 0", () => {
  expect(computeDelayMs("2026-10-24T00:00:00Z", new Date("2026-10-24T01:00:00Z"))).toBe(0);
  expect(computeDelayMs("2026-10-24T01:00:30Z", new Date("2026-10-24T01:00:00Z"))).toBe(30_000);
});
