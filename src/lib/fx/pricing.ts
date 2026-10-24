import type { Currency, FxRates, Invoice } from "@/lib/domain/types";
import { toUsdc } from "./convert";

/** Spread: market rate at send, 0.5 % fee. Fixed: the quote is locked for 24 h after the schedule, 1.1 % fee. */
export const SPREAD_FEE_BPS = 50;
export const FIXED_FEE_BPS = 110;
export const LOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateMode = "spread" | "fixed";

/** Form values and stored records: "fixed" → fixed; anything else (including undefined on legacy records) → spread. */
export function parseRateMode(v: unknown): RateMode {
  return v === "fixed" ? "fixed" : "spread";
}

export function feeBpsFor(mode: RateMode): number {
  return mode === "fixed" ? FIXED_FEE_BPS : SPREAD_FEE_BPS;
}

interface IssuePricing {
  rateMode: RateMode;
  feeBps: number;
  lockedRate?: number;
  lockExpiresAt?: string;
}

/** Pricing fields written on the invoice at issue; `marketRate` is the quote rate for its currency. */
export function priceAtIssue(mode: RateMode, marketRate: number, scheduledAt: string): IssuePricing {
  if (mode !== "fixed") return { rateMode: "spread", feeBps: SPREAD_FEE_BPS };
  return {
    rateMode: "fixed",
    feeBps: FIXED_FEE_BPS,
    lockedRate: marketRate,
    lockExpiresAt: new Date(new Date(scheduledAt).getTime() + LOCK_WINDOW_MS).toISOString(),
  };
}

/** What `priceAtSettlement` reads; a full `Invoice` qualifies. */
type PricedInvoice = Pick<Invoice, "amount" | "currency" | "rateMode" | "feeBps" | "lockedRate" | "lockExpiresAt">;

interface SettlementPricing {
  appliedRate: number;
  usdcAmount: string;
  feeUsdc: string;
  lockExpired: boolean;
}

/**
 * Rate and amounts used at send time. A fixed invoice settles at `lockedRate` while `now <= lockExpiresAt`;
 * after that (and always for spread) it settles at the market rate. The worker receives `usdcAmount`;
 * `feeUsdc` is the company's cost at the invoice's `feeBps`, which stays the fixed-mode fee even when the lock expired.
 */
export function priceAtSettlement(inv: PricedInvoice, market: FxRates, nowIso: string): SettlementPricing {
  const fixed = parseRateMode(inv.rateMode) === "fixed";
  const lockHolds = fixed && !!inv.lockExpiresAt && new Date(nowIso).getTime() <= new Date(inv.lockExpiresAt).getTime();
  const lockedRate = lockHolds && typeof inv.lockedRate === "number" ? inv.lockedRate : undefined;
  const appliedRate = lockedRate ?? market.rates[inv.currency];
  const usdcAmount = toUsdc(inv.amount, inv.currency, { ...market, rates: { ...market.rates, [inv.currency]: appliedRate } });
  return {
    appliedRate,
    usdcAmount,
    feeUsdc: feeFor(usdcAmount, inv.feeBps ?? feeBpsFor(fixed ? "fixed" : "spread")),
    lockExpired: fixed && lockedRate === undefined,
  };
}

/** floor(usdcAmount × feeBps / 10000) at 6 dp, in integer micro-units so no float error creeps into money. */
function feeFor(usdcAmount: string, feeBps: number): string {
  const [whole, frac = ""] = usdcAmount.split(".");
  const units = BigInt(whole + frac.padEnd(6, "0").slice(0, 6));
  const fee = (units * BigInt(feeBps)) / 10_000n;
  return `${fee / 1_000_000n}.${(fee % 1_000_000n).toString().padStart(6, "0")}`;
}

/** Client-side preview in plain numbers; `usdc` floors like `toUsdc` so it matches the server for the same rate. */
export function estimateUsdc(amount: number, currency: Currency, rate: number, mode: RateMode): { usdc: number; fee: number } {
  const usdc = Math.floor((amount / (currency === "USD" ? 1 : rate)) * 1e6) / 1e6;
  return { usdc, fee: (usdc * feeBpsFor(mode)) / 10_000 };
}
