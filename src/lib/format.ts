import type { Currency } from "@/lib/domain/types";

const ZERO_DP: Currency[] = ["KRW", "VND"];

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: ZERO_DP.includes(currency) ? 0 : 2,
  }).format(amount);
}

export function formatUsdc(value: string | number, token = "USDC"): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${token}`;
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
