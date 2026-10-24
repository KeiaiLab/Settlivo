import type { Currency } from "@/lib/domain/types";

/** Rates per 1 USD. Used when the live FX API is unreachable. */
export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  KRW: 1385.2,
  PHP: 58.4,
  BRL: 5.42,
  PLN: 3.98,
  VND: 25310,
  EUR: 0.921,
};
