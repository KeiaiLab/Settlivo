import type { Plan, PlanTier } from "./types";
import { FIXED_FEE_BPS, SPREAD_FEE_BPS, feeFor, type RateMode } from "@/lib/fx/pricing";

/** Roadmap §3: the sender pays a flat monthly fee; receiving is always free. Prices are demo assumptions. */
export const PLANS: Record<PlanTier, { label: string; monthlyUsd: number; sendsPerMonth: number | null; audience: string }> = {
  free: { label: "Free", monthlyUsd: 0, sendsPerMonth: 3, audience: "Individuals and companies" },
  pro: { label: "Pro", monthlyUsd: 9, sendsPerMonth: null, audience: "Individuals" },
  business: { label: "Business", monthlyUsd: 99, sendsPerMonth: null, audience: "Companies" },
};

function startOfNextMonth(nowIso: string): string {
  const d = new Date(nowIso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export function defaultPlan(nowIso: string): Plan {
  return { tier: "free", renewsAt: startOfNextMonth(nowIso), sendsThisMonth: 0 };
}

/** Accounts created before plans existed are Free; a plan whose period has passed renews with a fresh counter. */
export function currentPlan(plan: Plan | undefined, nowIso: string): Plan {
  const p = plan ?? defaultPlan(nowIso);
  if (new Date(nowIso).getTime() < new Date(p.renewsAt).getTime()) return p;
  return { ...p, sendsThisMonth: 0, renewsAt: startOfNextMonth(nowIso) };
}

export function remainingSends(plan: Plan): number | null {
  const limit = PLANS[plan.tier].sendsPerMonth;
  return limit === null ? null : Math.max(0, limit - plan.sendsThisMonth);
}

export function canSend(plan: Plan): boolean {
  const left = remainingSends(plan);
  return left === null || left > 0;
}

export function recordSend(plan: Plan): Plan {
  return { ...plan, sendsThisMonth: plan.sendsThisMonth + 1 };
}

export function upgrade(plan: Plan, tier: PlanTier, nowIso: string): Plan {
  return { ...plan, tier, renewsAt: new Date(new Date(nowIso).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() };
}

/**
 * Fee under the plan: paid tiers include USDC transfers, so only the fixed-rate premium (the part above the
 * spread fee) is still charged; Free pays the full per-transfer fee of §5.2.
 */
export function planFeeUsdc(tier: PlanTier, mode: RateMode, usdcAmount: string): string {
  if (tier === "free") return feeFor(usdcAmount, mode === "fixed" ? FIXED_FEE_BPS : SPREAD_FEE_BPS);
  return mode === "fixed" ? feeFor(usdcAmount, FIXED_FEE_BPS - SPREAD_FEE_BPS) : "0.000000";
}

/** What per-transfer billing would have cost: the §5.2 fee on every settled amount. */
export function perTransferFeeUsdc(invoices: { usdcAmount?: string; rateMode?: string }[]): string {
  let units = 0n;
  for (const inv of invoices) {
    if (!inv.usdcAmount) continue;
    const fee = feeFor(inv.usdcAmount, inv.rateMode === "fixed" ? FIXED_FEE_BPS : SPREAD_FEE_BPS);
    const [w, f = ""] = fee.split(".");
    units += BigInt(w + f.padEnd(6, "0").slice(0, 6));
  }
  return `${units / 1_000_000n}.${(units % 1_000_000n).toString().padStart(6, "0")}`;
}
