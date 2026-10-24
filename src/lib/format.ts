import type { Currency } from "@/lib/domain/types";

const ZERO_DP: Currency[] = ["KRW", "VND"];
const dpFor = (currency: Currency) => (ZERO_DP.includes(currency) ? 0 : 2);

export interface MoneyParts {
  /** Currency marker, e.g. "₩", "R$", "zł". */
  unit: string;
  /** Grouped digits including sign and decimals, e.g. "-4,200,000.50". */
  digits: string;
  code: Currency;
}

/** Split a local-currency amount into its marker and grouped digits so the UI can align them separately. */
export function moneyParts(amount: number, currency: Currency, opts: { dp?: number } = {}): MoneyParts {
  const dp = opts.dp ?? dpFor(currency);
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).formatToParts(amount);
  const unit = parts.filter((p) => p.type === "currency").map((p) => p.value).join("");
  const digits = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
  return { unit, digits, code: currency };
}

export function formatMoney(amount: number, currency: Currency): string {
  const { unit, digits } = moneyParts(amount, currency);
  return `${unit}${digits}`;
}

/** Stablecoin amounts: grouped, 2 dp for display, or the full 6 dp when `exact` (on-chain record). */
export function usdcParts(value: string | number, token = "USDC", opts: { exact?: boolean } = {}): { digits: string; unit: string } {
  const n = typeof value === "string" ? Number(value) : value;
  const dp = opts.exact ? 6 : 2;
  return { digits: n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }), unit: token };
}

export function formatUsdc(value: string | number, token = "USDC", opts: { exact?: boolean } = {}): string {
  const { digits, unit } = usdcParts(value, token, opts);
  return `${digits} ${unit}`;
}

export function formatRate(rate: number, currency: Currency): string {
  return `${rate.toLocaleString("en-US", { maximumFractionDigits: rate > 100 ? 2 : 4 })} ${currency}/USD`;
}

export function shortHash(hash: string, n = 6): string {
  return `${hash.slice(0, n + 2)}…${hash.slice(-n)}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (Math.abs(m) < 1) return "just now";
  if (Math.abs(m) < 60) return m > 0 ? `${m}m ago` : `in ${-m}m`;
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return h > 0 ? `${h}h ago` : `in ${-h}h`;
  const d = Math.round(h / 24);
  return d > 0 ? `${d}d ago` : `in ${-d}d`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
