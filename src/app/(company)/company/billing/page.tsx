import Link from "next/link";
import { Page } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money, Usdc } from "@/components/ui/money";
import { upgradePlan } from "@/lib/actions/billing";
import { currentPlan, perTransferFeeUsdc, PLANS, remainingSends } from "@/lib/domain/plan";
import type { PlanTier } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { FIXED_FEE_BPS, SPREAD_FEE_BPS } from "@/lib/fx/pricing";
import { companyContext, thisMonth } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";
import { cn } from "@/lib/utils";

const TIERS: PlanTier[] = ["free", "pro", "business"];
/** The part of the fixed-rate fee above the spread fee; paid plans still charge it (see `planFeeUsdc`). */
const FIXED_PREMIUM_PCT = ((FIXED_FEE_BPS - SPREAD_FEE_BPS) / 100).toFixed(1);

const sendsLabel = (limit: number | null) => (limit === null ? "Unlimited sends" : `${limit} sends / month`);

/** Roadmap stage 1: the sending account's subscription, this month's usage, and a simulated upgrade checkout. */
export default async function BillingPage() {
  const s = await requireCompany();
  const { org, invoices, workerMap } = await companyContext(s.orgId);
  if (!org) return <Page title="Organization not found"><p className="text-sm text-muted-foreground">Seed the database first.</p></Page>;
  const plan = currentPlan(org.plan, new Date().toISOString());
  const tier = PLANS[plan.tier];
  const left = remainingSends(plan);
  const held = invoices.filter((i) => i.status === "scheduled" && i.blockedReason === "plan");
  const confirmedThisMonth = invoices.filter((i) => i.status === "confirmed" && thisMonth(i.history.at(-1)?.at ?? i.createdAt));
  const usedPct = tier.sendsPerMonth === null ? 0 : Math.min(100, Math.round((plan.sendsThisMonth / tier.sendsPerMonth) * 100));

  return (
    <Page title="Billing" description="The sending account pays a flat monthly fee. Receiving is always free.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="current-plan">
          <CardHeader>
            <CardTitle className="text-sm">Current plan</CardTitle>
            <CardDescription>{org.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{tier.label}</div>
              <div className="text-muted-foreground"><Money amount={tier.monthlyUsd} currency="USD" dp={0} /> per month</div>
            </div>
            <div className="text-muted-foreground">Renews {formatDateTime(plan.renewsAt)}</div>
            <div className="space-y-1.5">
              <div>Sends this month: <span className="tabular-nums">{plan.sendsThisMonth}{tier.sendsPerMonth ? ` of ${tier.sendsPerMonth}` : ""}</span></div>
              {tier.sendsPerMonth !== null && (
                <div
                  role="progressbar"
                  aria-label="Sends used this month"
                  aria-valuemin={0}
                  aria-valuemax={tier.sendsPerMonth}
                  aria-valuenow={Math.min(plan.sendsThisMonth, tier.sendsPerMonth)}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div className={cn("h-full rounded-full", left === 0 ? "bg-orange-400" : "bg-emerald-400")} style={{ width: `${usedPct}%` }} />
                </div>
              )}
            </div>
            {left === 0 && (
              <p className="rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-orange-300">Limit reached. New payouts wait until you upgrade or the month renews.</p>
            )}
            <div className="space-y-2">
              <div>Held payouts: <span className="tabular-nums">{held.length}</span></div>
              {held.map((i) => (
                <Link key={i.id} href={`/company/invoices/${i.id}`} className="flex items-center justify-between gap-3 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 hover:bg-orange-500/10">
                  <span className="truncate">{workerMap[i.workerId]?.name ?? i.workerId} · {i.memo}</span>
                  <Money amount={i.amount} currency={i.currency} className="shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What per-transfer billing would have cost</CardTitle>
            <CardDescription>{confirmedThisMonth.length} confirmed settlement{confirmedThisMonth.length === 1 ? "" : "s"} this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground">Per-transfer fees</div>
                <Usdc value={perTransferFeeUsdc(confirmedThisMonth)} size="lg" />
              </div>
              <div>
                <div className="text-muted-foreground">Your plan</div>
                <Money amount={tier.monthlyUsd} currency="USD" dp={0} size="lg" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Fixed-rate premium ({FIXED_PREMIUM_PCT}%) and off-ramp fees stay outside the plan.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => {
              const p = PLANS[t];
              const isCurrent = t === plan.tier;
              return (
                <div key={t} className={cn("flex flex-col gap-3 rounded-lg border p-4", isCurrent && "border-emerald-500/40 bg-emerald-500/5")}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.label}</div>
                    {isCurrent && <Badge variant="outline">Current</Badge>}
                  </div>
                  <div><Money amount={p.monthlyUsd} currency="USD" dp={0} size="lg" /> <span className="text-xs text-muted-foreground">per month</span></div>
                  <div className="text-muted-foreground">{p.audience}</div>
                  <div>{sendsLabel(p.sendsPerMonth)}</div>
                  {t === "free" ? (
                    <p className="mt-auto text-muted-foreground">Included</p>
                  ) : (
                    <form action={upgradePlan} className="mt-auto grid gap-3">
                      <input type="hidden" name="tier" value={t} />
                      {t === "business" && (
                        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                          <div className="grid gap-1">
                            <Label htmlFor="card-number" className="text-xs text-muted-foreground">Card number</Label>
                            <Input id="card-number" disabled defaultValue="4242 4242 4242 4242" className="h-7 px-2 font-mono text-xs md:text-xs" />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="card-expiry" className="text-xs text-muted-foreground">Expiry</Label>
                            <Input id="card-expiry" disabled defaultValue="12/28" className="h-7 px-2 font-mono text-xs md:text-xs" />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="card-cvc" className="text-xs text-muted-foreground">CVC</Label>
                            <Input id="card-cvc" disabled defaultValue="123" className="h-7 px-2 font-mono text-xs md:text-xs" />
                          </div>
                        </div>
                      )}
                      <Button type="submit" disabled={isCurrent}>{isCurrent ? "Current plan" : `Upgrade to ${p.label}`}</Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Simulated checkout — no card is charged.</p>
        </CardContent>
      </Card>
    </Page>
  );
}
