import type { FxHistoryPoint, Invoice, Notification, PayrollRun, Tx, Withdrawal, Worker } from "@/lib/domain/types";
import { FALLBACK_RATES } from "@/lib/fx/fallback";
import { priceAtIssue, priceAtSettlement, type RateMode } from "@/lib/fx/pricing";
import { formatMoney, formatUsdc } from "@/lib/format";
import { buildTransferCalldata, invoiceHash } from "@/lib/chain/memo";
import { PLATFORM_SIM_ADDRESS } from "@/lib/chain/types";
import { WORKERS, ORG_ACME, ORG_NORDWIND } from "./personas";

/** Deterministic PRNG (mulberry32) so reseeds look identical. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = prng(20261024);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rand() * 16)]).join("");
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number, hour = 9) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, Math.floor(rand() * 60), 0, 0);
  return d;
};

const SALARY: Record<string, number> = {
  wrk_alice: 4_200_000, // KRW
  wrk_bob: 95_000, // PHP
  wrk_carlos: 9_800, // BRL
  wrk_dana: 12_500, // PLN
  wrk_eun: 38_000_000, // VND
};

const MEMOS = ["Monthly salary", "Sprint bonus", "Contract milestone", "Design retainer", "On-call stipend"];

export function fxHistory(days = 30): FxHistoryPoint[] {
  const points: FxHistoryPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const rates = { ...FALLBACK_RATES };
    for (const k of Object.keys(rates) as (keyof typeof rates)[]) {
      if (k === "USD") continue;
      rates[k] = Number((rates[k] * (1 + (rand() - 0.5) * 0.02)).toPrecision(6));
    }
    points.push({ at: iso(daysAgo(i, 0)), rates });
  }
  return points;
}

export interface Generated {
  invoices: Invoice[];
  txs: Tx[];
  payrollRuns: PayrollRun[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
}

function makeConfirmed(worker: Worker, orgId: string, when: Date, amount: number, memo: string, opts: { mode?: RateMode; extra?: Partial<Invoice> } = {}): { inv: Invoice; tx: Tx } {
  const id = `inv_${hex(8)}`;
  const quoteRate = Number((FALLBACK_RATES[worker.localCurrency] * (1 + (rand() - 0.5) * 0.01)).toPrecision(6));
  const executedRate = Number((quoteRate * (1 + (rand() - 0.5) * 0.004)).toPrecision(6));
  const rates = { base: "USD" as const, rates: { ...FALLBACK_RATES, [worker.localCurrency]: executedRate }, fetchedAt: "", source: "fallback" as const };
  const base = {
    id,
    orgId,
    workerId: worker.id,
    amount,
    currency: worker.localCurrency,
    scheduledAt: iso(when),
    memo,
    ...priceAtIssue(opts.mode ?? "spread", quoteRate, iso(when)),
  };
  // Settled on schedule, i.e. inside a fixed invoice's 24 h lock, so fixed ones apply the locked quote.
  const pricing = priceAtSettlement(base, rates, iso(when));
  const { usdcAmount } = pricing;
  const hash = invoiceHash(base);
  const txHash = `0x${hex(64)}`;
  const to = worker.payoutPrefs.wallet === "external" && worker.payoutPrefs.externalAddress ? worker.payoutPrefs.externalAddress : worker.platformWallet;
  const tx: Tx = {
    id: `tx_${hex(8)}`,
    hash: txHash,
    from: PLATFORM_SIM_ADDRESS,
    to,
    token: worker.payoutPrefs.stablecoin,
    amount: usdcAmount,
    blockNumber: 21_000_000 + Math.floor((when.getTime() / 1000 - 1_750_000_000) / 2),
    gasUsed: 51_000 + Math.floor(rand() * 14_000),
    status: "confirmed",
    calldata: buildTransferCalldata(to.toLowerCase() as `0x${string}`, BigInt(Math.round(Number(usdcAmount) * 1e6)), { invoiceId: id, invoiceHash: hash }),
    memo: { invoiceId: id, invoiceHash: hash },
    explorerUrl: `/explorer/tx/${txHash}`,
    createdAt: iso(when),
    confirmedAt: iso(new Date(when.getTime() + 4000)),
  };
  const created = new Date(when.getTime() - 2 * 86_400_000);
  const inv: Invoice = {
    ...base,
    initiatedBy: "company",
    stablecoin: worker.payoutPrefs.stablecoin,
    status: "confirmed",
    quoteRate,
    executedRate,
    usdcAmount,
    appliedRate: pricing.appliedRate,
    feeUsdc: pricing.feeUsdc,
    txId: tx.id,
    invoiceHash: hash,
    history: [
      { status: "pending_approval", at: iso(created), by: `org:${orgId}` },
      { status: "scheduled", at: iso(new Date(created.getTime() + 3600_000)), by: `worker:${worker.id}` },
      { status: "sending", at: iso(when), by: "system:settlement" },
      { status: "confirmed", at: tx.confirmedAt!, by: "system:settlement" },
    ],
    createdAt: iso(created),
    ...opts.extra,
  };
  return { inv, tx };
}

export function generate(): Generated {
  const invoices: Invoice[] = [];
  const txs: Tx[] = [];
  const payrollRuns: PayrollRun[] = [];
  const withdrawals: Withdrawal[] = [];
  const notifications: Notification[] = [];
  const byId = Object.fromEntries(WORKERS.map((w) => [w.id, w]));

  // Three monthly payroll runs for Acme (last two as PayrollRun records), 3 months back.
  for (const monthsBack of [3, 2, 1]) {
    const when = daysAgo(monthsBack * 30 - 26, 10);
    const members = WORKERS.filter((w) => w.orgIds.includes(ORG_ACME) && w.kyc.status === "verified");
    const runId = `run_${hex(8)}`;
    const ids: string[] = [];
    for (const w of members) {
      const { inv, tx } = makeConfirmed(w, ORG_ACME, when, SALARY[w.id], "Monthly salary", monthsBack <= 2 ? { extra: { payrollRunId: runId } } : {});
      invoices.push(inv);
      txs.push(tx);
      ids.push(inv.id);
    }
    if (monthsBack <= 2) payrollRuns.push({ id: runId, orgId: ORG_ACME, invoiceIds: ids, status: "completed", createdAt: iso(when) });
  }
  // Nordwind monthly for Alice (fixed-rate, §5.2) + Dana.
  for (const monthsBack of [3, 2, 1]) {
    const when = daysAgo(monthsBack * 30 - 5, 11);
    for (const w of [byId.wrk_alice, byId.wrk_dana]) {
      const amount = w.id === "wrk_alice" ? 1_900_000 : SALARY[w.id];
      const { inv, tx } = makeConfirmed(w, ORG_NORDWIND, when, amount, "Monthly salary", { mode: w.id === "wrk_alice" ? "fixed" : "spread" });
      invoices.push(inv); txs.push(tx);
    }
  }
  // Finn worked for Nordwind until September (offboarded, §5.11): history only.
  for (const monthsBack of [3, 2]) {
    const { inv, tx } = makeConfirmed(byId.wrk_finn, ORG_NORDWIND, daysAgo(monthsBack * 30 - 5, 11), 4_100, "Monthly salary");
    invoices.push(inv); txs.push(tx);
  }
  // Ad-hoc bonuses / milestones.
  for (let i = 0; i < 6; i++) {
    const w = pick(WORKERS.filter((x) => x.kyc.status === "verified" && x.orgIds.length > 0));
    const org = w.orgIds.includes(ORG_ACME) ? ORG_ACME : ORG_NORDWIND;
    const { inv, tx } = makeConfirmed(w, org, daysAgo(5 + Math.floor(rand() * 70), 14), Math.round(SALARY[w.id] * (0.1 + rand() * 0.3)), pick(MEMOS.slice(1)));
    invoices.push(inv); txs.push(tx);
  }
  // One pending worker-initiated request (Carlos) and one blocked (Eun).
  {
    const w = byId.wrk_carlos;
    const id = `inv_${hex(8)}`;
    const scheduledAt = iso(daysAgo(-1, 9));
    const base = { id, orgId: ORG_ACME, workerId: w.id, amount: 2_400, currency: w.localCurrency, scheduledAt, memo: "Overtime: release weekend", ...priceAtIssue("spread", FALLBACK_RATES.BRL, scheduledAt) };
    invoices.push({ ...base, initiatedBy: "worker", stablecoin: "USDC", status: "pending_approval", quoteRate: FALLBACK_RATES.BRL, invoiceHash: invoiceHash(base), history: [{ status: "pending_approval", at: iso(daysAgo(0, 7)), by: `worker:${w.id}` }], createdAt: iso(daysAgo(0, 7)) });
  }
  {
    const w = byId.wrk_eun;
    const id = `inv_${hex(8)}`;
    const scheduledAt = iso(daysAgo(1, 9));
    const base = { id, orgId: ORG_ACME, workerId: w.id, amount: SALARY.wrk_eun, currency: w.localCurrency, scheduledAt, memo: "Monthly salary", ...priceAtIssue("spread", FALLBACK_RATES.VND, scheduledAt) };
    invoices.push({ ...base, initiatedBy: "company", stablecoin: "USDC", status: "scheduled", blockedReason: "kyc", quoteRate: FALLBACK_RATES.VND, invoiceHash: invoiceHash(base), history: [{ status: "pending_approval", at: iso(daysAgo(3, 9)), by: `org:${ORG_ACME}` }, { status: "scheduled", at: iso(daysAgo(2, 9)), by: `worker:${w.id}` }], createdAt: iso(daysAgo(3, 9)) });
  }
  // Withdrawals.
  for (const [wid, usdc, bank] of [["wrk_alice", "1500.000000", "****2841"], ["wrk_bob", "900.000000", "****7730"], ["wrk_dana", "2200.000000", "****5522"]] as const) {
    const w = byId[wid];
    const rate = FALLBACK_RATES[w.localCurrency];
    const fee = (Number(usdc) * 0.005).toFixed(6);
    const when = daysAgo(3 + Math.floor(rand() * 20), 16);
    withdrawals.push({ id: `wd_${hex(8)}`, workerId: wid, usdcAmount: usdc, currency: w.localCurrency, rate, fee, localAmount: Math.round((Number(usdc) - Number(fee)) * rate), eta: "~10 minutes", status: "completed", bankAccountMasked: bank, createdAt: iso(when), completedAt: iso(new Date(when.getTime() + 9 * 60_000)) });
  }
  // Notifications: derive from confirmed invoices (both sides) + a few extras.
  let n = 0;
  for (const inv of invoices.filter((i) => i.status === "confirmed").slice(0, 10)) {
    const w = byId[inv.workerId];
    notifications.push(
      { id: `ntf_${hex(8)}`, recipient: { type: "worker", id: w.id }, kind: "invoice_settled", title: `You received ${formatUsdc(inv.usdcAmount!, inv.stablecoin, { exact: true })}`, body: `${formatMoney(inv.amount, inv.currency)} settled on-chain.`, href: `/worker/invoices/${inv.id}`, read: n++ > 2, createdAt: inv.history.at(-1)!.at },
      { id: `ntf_${hex(8)}`, recipient: { type: "org", id: inv.orgId }, kind: "invoice_settled", title: `Settled ${formatUsdc(inv.usdcAmount!, inv.stablecoin, { exact: true })} to ${w.name}`, body: `${formatMoney(inv.amount, inv.currency)} confirmed on-chain.`, href: `/company/invoices/${inv.id}`, read: n > 4, createdAt: inv.history.at(-1)!.at },
    );
  }
  const pending = invoices.find((i) => i.status === "pending_approval")!;
  const blocked = invoices.find((i) => i.blockedReason)!;
  notifications.push(
    { id: `ntf_${hex(8)}`, recipient: { type: "org", id: ORG_ACME }, kind: "invoice_created", title: "Payment request from Carlos Mendes", body: `${formatMoney(pending.amount, pending.currency)} · ${pending.memo}`, href: `/company/approvals`, read: false, createdAt: pending.createdAt },
    { id: `ntf_${hex(8)}`, recipient: { type: "org", id: ORG_ACME }, kind: "prefs_submitted", title: "Bob Reyes changed payout settings", body: "External wallet → Settlivo wallet, USDT → USDC", href: `/company/approvals`, read: false, createdAt: byId.wrk_bob.pendingPayoutPrefs!.submittedAt },
    { id: `ntf_${hex(8)}`, recipient: { type: "org", id: ORG_ACME }, kind: "invoice_blocked", title: "Payout blocked: verification pending", body: "Eun Nguyen's salary is waiting for KYC verification.", href: `/company/invoices/${blocked.id}`, read: false, createdAt: blocked.history.at(-1)!.at },
    { id: `ntf_${hex(8)}`, recipient: { type: "worker", id: "wrk_eun" }, kind: "invoice_scheduled", title: `Complete verification to receive ${formatMoney(blocked.amount, blocked.currency)}`, body: "Your first salary is scheduled. Finish KYC to unlock it.", href: `/worker/onboarding`, read: false, createdAt: blocked.history.at(-1)!.at },
    ...withdrawals.map<Notification>((w) => ({ id: `ntf_${hex(8)}`, recipient: { type: "worker", id: w.workerId }, kind: "withdrawal_completed", title: `Withdrawal completed: ${formatMoney(w.localAmount, w.currency)}`, body: `Funds sent to ${w.bankAccountMasked}.`, href: "/worker/withdraw", read: true, createdAt: w.completedAt! })),
  );
  return { invoices, txs, payrollRuns, withdrawals, notifications };
}
