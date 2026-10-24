import { SUPPORTED_CURRENCIES, type Currency, type FxRates } from "@/lib/domain/types";
import { FALLBACK_RATES } from "./fallback";

const DEFAULT_URL = "https://open.er-api.com/v6/latest/USD";

interface GetRatesOptions {
  fetchImpl?: typeof fetch;
  /** Apply ±0.3% random drift to non-USD rates (simulated send-time movement). */
  drift?: boolean;
}

export async function getRates(opts: GetRatesOptions = {}): Promise<FxRates> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let rates: FxRates;
  try {
    const res = await fetchImpl(process.env.FX_API_URL ?? DEFAULT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`fx api ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json.rates) throw new Error("fx api: no rates");
    const picked = {} as Record<Currency, number>;
    for (const c of SUPPORTED_CURRENCIES) {
      const v = json.rates[c];
      if (typeof v !== "number") throw new Error(`fx api: missing ${c}`);
      picked[c] = v;
    }
    picked.USD = 1;
    rates = { base: "USD", rates: picked, fetchedAt: new Date().toISOString(), source: "live" };
  } catch {
    rates = { base: "USD", rates: { ...FALLBACK_RATES }, fetchedAt: new Date().toISOString(), source: "fallback" };
  }
  if (opts.drift) {
    for (const c of SUPPORTED_CURRENCIES) {
      if (c === "USD") continue;
      const factor = 1 + (Math.random() * 2 - 1) * 0.003;
      rates.rates[c] = Number((rates.rates[c] * factor).toPrecision(8));
    }
  }
  return rates;
}
