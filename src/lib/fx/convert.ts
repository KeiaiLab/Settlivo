import type { Currency, FxRates } from "@/lib/domain/types";

/** Local-currency amount → USDC as a 6-dp string, floored. */
export function toUsdc(amount: number, currency: Currency, rates: FxRates): string {
  const rate = currency === "USD" ? 1 : rates.rates[currency];
  const units = Math.floor((amount / rate) * 1e6);
  return (units / 1e6).toFixed(6);
}

/** USDC string → local-currency amount (rounded to 2 dp). */
export function fromUsdc(usdc: string, currency: Currency, rates: FxRates): number {
  const rate = currency === "USD" ? 1 : rates.rates[currency];
  return Math.round(Number(usdc) * rate * 100) / 100;
}
