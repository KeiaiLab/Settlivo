import { expect, test } from "vitest";
import { FALLBACK_RATES } from "./fallback";
import { getRates } from "./rates";

test("getRates falls back on fetch error", async () => {
  const r = await getRates({ fetchImpl: async () => { throw new Error("down"); } });
  expect(r.source).toBe("fallback");
  expect(r.rates.KRW).toBe(FALLBACK_RATES.KRW);
});

test("getRates parses live payload and drops unsupported currencies", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ result: "success", rates: { KRW: 1400, PHP: 58, BRL: 5.1, PLN: 4, VND: 25000, EUR: 0.92, USD: 1, JPY: 150 } }))) as unknown as typeof fetch;
  const r = await getRates({ fetchImpl });
  expect(r.source).toBe("live");
  expect(r.rates.KRW).toBe(1400);
  expect((r.rates as Record<string, number>).JPY).toBeUndefined();
});

test("getRates with drift keeps USD at 1 and moves others within ±0.3%", async () => {
  const r = await getRates({ fetchImpl: async () => { throw new Error("down"); }, drift: true });
  expect(r.rates.USD).toBe(1);
  const ratio = r.rates.KRW / FALLBACK_RATES.KRW;
  expect(ratio).toBeGreaterThan(0.996);
  expect(ratio).toBeLessThan(1.004);
});
