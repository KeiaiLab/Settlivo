"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getChain } from "@/lib/chain";
import { SimulatedChain } from "@/lib/chain/simulated";
import { invoiceHash } from "@/lib/chain/memo";
import { getOrg, getWorker, putInvoice, putWithdrawal, putWorker } from "@/lib/db/repo";
import { newId } from "@/lib/domain/ids";
import { SUPPORTED_CURRENCIES, type Currency, type Invoice, type PayoutPrefs, type Withdrawal } from "@/lib/domain/types";
import { fromUsdc } from "@/lib/fx/convert";
import { parseRateMode, priceAtIssue } from "@/lib/fx/pricing";
import { formatDateTime, formatMoney } from "@/lib/format";
import { approveInvoice, scheduleInvoice } from "@/lib/scheduler";
import { notify } from "@/lib/settlement/notify";
import { requireWorker } from "@/lib/session";
import { currentRates } from "./invoices";

const WITHDRAW_FEE = 0.005;

export async function approveMyInvoice(id: string, approved: boolean, reason?: string) {
  const s = await requireWorker();
  await approveInvoice(id, `worker:${s.workerId}`, approved, reason);
  revalidatePath("/worker");
}

export async function requestPayment(formData: FormData) {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) throw new Error("Worker not found");
  const orgId = String(formData.get("orgId"));
  const org = await getOrg(orgId);
  if (!org || !worker.orgIds.includes(orgId)) throw new Error("Not a member of that organization");
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");
  const currency = String(formData.get("currency")) as Currency;
  if (!SUPPORTED_CURRENCIES.includes(currency)) throw new Error("Unsupported currency");
  const scheduledRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = (scheduledRaw ? new Date(scheduledRaw) : new Date(Date.now() + 2 * 60_000)).toISOString();
  const memo = String(formData.get("memo") ?? "").trim() || "Payment request";
  const rates = await currentRates();
  const pricing = priceAtIssue(parseRateMode(formData.get("rateMode")), rates.rates[currency], scheduledAt);
  const base = { id: newId("inv"), orgId, workerId: worker.id, amount, currency, scheduledAt, memo, ...pricing };
  const now = new Date().toISOString();
  const inv: Invoice = {
    ...base,
    initiatedBy: "worker",
    stablecoin: worker.payoutPrefs.stablecoin,
    status: "pending_approval",
    quoteRate: rates.rates[currency],
    invoiceHash: invoiceHash(base),
    history: [{ status: "pending_approval", at: now, by: `worker:${worker.id}` }],
    createdAt: now,
  };
  await putInvoice(inv);
  await notify({ type: "org", id: orgId }, "invoice_created", `Payment request from ${worker.name}: ${formatMoney(amount, currency)}`, `${memo} · wants it ${formatDateTime(scheduledAt)}`, "/company/approvals");
  await scheduleInvoice(inv.id);
  redirect(`/worker/invoices/${inv.id}`);
}

export async function submitPayoutPrefs(formData: FormData) {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) throw new Error("Worker not found");
  const wallet = formData.get("wallet") === "external" ? "external" : "platform";
  const externalAddress = String(formData.get("externalAddress") ?? "").trim().toLowerCase();
  if (wallet === "external" && !/^0x[0-9a-f]{40}$/.test(externalAddress)) throw new Error("External address must be a 0x… 40-hex address");
  const prefs: PayoutPrefs = {
    wallet,
    externalAddress: wallet === "external" ? externalAddress : undefined,
    stablecoin: formData.get("stablecoin") === "USDT" ? "USDT" : "USDC",
    displayCurrency: (String(formData.get("displayCurrency")) as Currency) || worker.localCurrency,
    cadence: (["monthly", "biweekly", "per_invoice"].includes(String(formData.get("cadence"))) ? String(formData.get("cadence")) : "monthly") as PayoutPrefs["cadence"],
    bankAccount: String(formData.get("bankName") ?? "").trim()
      ? { bankName: String(formData.get("bankName")).trim(), accountMasked: `****${String(formData.get("accountLast4") ?? "0000").slice(-4)}`, holder: worker.name }
      : worker.payoutPrefs.bankAccount,
  };
  await putWorker({ ...worker, pendingPayoutPrefs: { ...prefs, submittedAt: new Date().toISOString() } });
  await Promise.all(worker.orgIds.map((orgId) => notify({ type: "org", id: orgId }, "prefs_submitted", `${worker.name} changed payout settings`, `${prefs.wallet === "external" ? "External wallet" : "Settlivo wallet"} · ${prefs.stablecoin} · ${prefs.cadence.replace("_", " ")}. Needs approval.`, "/company/approvals")));
  revalidatePath("/worker/settings");
}

export async function createWithdrawal(formData: FormData) {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) throw new Error("Worker not found");
  if (!worker.payoutPrefs.bankAccount) throw new Error("Add a bank account in Settings first");
  const usdc = Number(formData.get("usdcAmount"));
  if (!Number.isFinite(usdc) || usdc <= 0) throw new Error("Amount must be positive");
  const currency = worker.localCurrency;
  const rates = await currentRates();
  const fee = usdc * WITHDRAW_FEE;
  const net = (usdc - fee).toFixed(6);
  const chain = getChain();
  const address = worker.payoutPrefs.wallet === "external" && worker.payoutPrefs.externalAddress ? worker.payoutPrefs.externalAddress : worker.platformWallet;
  const balance = Number(await chain.getBalance(address, worker.payoutPrefs.stablecoin));
  if (usdc > balance) throw new Error(`Insufficient balance (${balance.toFixed(2)} ${worker.payoutPrefs.stablecoin})`);
  if (chain instanceof SimulatedChain) await chain.setBalance(address, worker.payoutPrefs.stablecoin, (balance - usdc).toFixed(6));
  const wd: Withdrawal = {
    id: newId("wd"),
    workerId: worker.id,
    usdcAmount: usdc.toFixed(6),
    currency,
    rate: rates.rates[currency],
    fee: fee.toFixed(6),
    localAmount: fromUsdc(net, currency, rates),
    eta: "~10 minutes",
    status: "processing",
    bankAccountMasked: `${worker.payoutPrefs.bankAccount.bankName} ${worker.payoutPrefs.bankAccount.accountMasked}`,
    createdAt: new Date().toISOString(),
  };
  await putWithdrawal(wd);
  revalidatePath("/worker/withdraw");
  redirect("/worker/withdraw");
}

export async function completeKycStep(step: "identity" | "address" | "tax") {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) return;
  await putWorker({ ...worker, kyc: { ...worker.kyc, steps: { ...worker.kyc.steps, [step]: true } } });
  revalidatePath("/worker/onboarding");
}

export async function finishKyc() {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) return;
  const now = new Date().toISOString();
  await putWorker({ ...worker, kyc: { status: "verified", steps: { identity: true, address: true, tax: true }, verifiedAt: now } });
  await notify({ type: "worker", id: worker.id }, "kyc_verified", "You're verified", "Payouts are unlocked. Scheduled invoices can now settle.", "/worker");
  await Promise.all(worker.orgIds.map((orgId) => notify({ type: "org", id: orgId }, "kyc_verified", `${worker.name} completed verification`, "Blocked payouts can be retried now.", `/company/workers/${worker.id}`)));
  revalidatePath("/worker");
  redirect("/worker");
}
