import { getChain, chainMode } from "@/lib/chain";
import { getInvoice, getOrg, getWorker, listWalletsByOwner, putFxRates, putInvoice, putOrg, putWorker, pushFxHistory } from "@/lib/db/repo";
import { canSend, currentPlan, planFeeUsdc, recordSend, remainingSends, PLANS } from "@/lib/domain/plan";
import { parseRateMode } from "@/lib/fx/pricing";
import { completeOffboarding, membershipFor } from "@/lib/domain/membership";
import { defaultWallet } from "@/lib/domain/wallets";
import { transition } from "@/lib/domain/invoice-status";
import type { Invoice, Worker } from "@/lib/domain/types";
import { priceAtSettlement } from "@/lib/fx/pricing";
import { getRates } from "@/lib/fx/rates";
import { formatDateTime, formatMoney, formatRate, formatUsdc } from "@/lib/format";
import { notify } from "./notify";

const SYSTEM = "system:settlement";

/** Default active wallet entity (§5.12); older records without wallets fall back to the payout prefs. */
async function payoutWallet(w: Worker): Promise<{ id?: string; address: string }> {
  const wallet = defaultWallet(await listWalletsByOwner({ type: "worker", id: w.id }));
  if (wallet) return { id: wallet.id, address: wallet.address };
  return { address: w.payoutPrefs.wallet === "external" && w.payoutPrefs.externalAddress ? w.payoutPrefs.externalAddress : w.platformWallet };
}

const fmtAmount = (inv: Invoice) => formatMoney(inv.amount, inv.currency);

/** Spec §5.4. Returns the invoice in its final state for this attempt. */
export async function settleInvoice(invoiceId: string): Promise<Invoice> {
  let inv = await getInvoice(invoiceId);
  if (!inv) throw new Error(`invoice ${invoiceId} not found`);
  if (inv.status !== "scheduled") return inv;
  const worker = await getWorker(inv.workerId);
  if (!worker) throw new Error(`worker ${inv.workerId} not found`);

  if (worker.kyc.status !== "verified") {
    inv = { ...inv, blockedReason: "kyc" };
    await putInvoice(inv);
    await notify(
      { type: "org", id: inv.orgId },
      "invoice_blocked",
      "Payout blocked: verification pending",
      `${worker.name}'s invoice (${fmtAmount(inv)}) is waiting for KYC verification.`,
      `/company/invoices/${inv.id}`,
    );
    return inv;
  }

  // Roadmap stage 1: the sending account's plan must have sends left this month.
  const org = await getOrg(inv.orgId);
  const nowIso = new Date().toISOString();
  const plan = currentPlan(org?.plan, nowIso);
  if (!canSend(plan)) {
    inv = { ...inv, blockedReason: "plan" };
    await putInvoice(inv);
    await notify(
      { type: "org", id: inv.orgId },
      "invoice_blocked_plan",
      `Monthly send limit reached (${PLANS[plan.tier].sendsPerMonth} on ${PLANS[plan.tier].label})`,
      `${fmtAmount(inv)} for ${worker.name} is on hold. Upgrade to keep sending this month.`,
      "/company/billing",
    );
    return inv;
  }

  inv = transition(inv, "sending", SYSTEM, { blockedReason: undefined });
  await putInvoice(inv);

  try {
    const rates = await getRates({ drift: chainMode() === "simulated" });
    await putFxRates(rates);
    await pushFxHistory({ at: rates.fetchedAt, rates: rates.rates });
    // executedRate is the market rate at send (quote/executed delta); the amount follows the pricing mode (§5.2).
    const executedRate = rates.rates[inv.currency];
    const pricing = priceAtSettlement(inv, rates, new Date().toISOString());
    const { usdcAmount, appliedRate } = pricing;

    const chain = getChain();
    const wallet = await payoutWallet(worker);
    const tx = await chain.transfer({
      token: worker.payoutPrefs.stablecoin,
      to: wallet.address,
      amount: usdcAmount,
      memo: { invoiceId: inv.id, invoiceHash: inv.invoiceHash },
    });
    inv = { ...inv, txId: tx.id, executedRate, usdcAmount, appliedRate, feeUsdc: planFeeUsdc(plan.tier, parseRateMode(inv.rateMode), pricing.usdcAmount), lockExpired: pricing.lockExpired || undefined, payoutWalletId: wallet.id };
    await putInvoice(inv);

    await chain.waitForConfirmation(tx.id);
    inv = transition(inv, "confirmed", SYSTEM);
    await putInvoice(inv);
    if (org) {
      const latestOrg = (await getOrg(org.id)) ?? org;
      const counted = recordSend(currentPlan(latestOrg.plan, nowIso));
      await putOrg({ ...latestOrg, plan: counted });
      if (remainingSends(counted) === 0) {
        await notify({ type: "org", id: org.id }, "invoice_blocked_plan", "Last free send of the month used", "The next payout will wait until you upgrade or the month renews.", "/company/billing");
      }
    }

    // A final settlement closes the membership (§5.11).
    const membership = membershipFor(worker, inv.orgId);
    if (membership?.status === "offboarding" && membership.finalInvoiceId === inv.id) {
      const latest = (await getWorker(worker.id)) ?? worker;
      await putWorker(completeOffboarding(latest, inv.orgId, new Date().toISOString()));
      await notify({ type: "worker", id: worker.id }, "worker_offboarded", "Final payment settled", "Your membership has ended; your history and wallet stay available.", `/worker/invoices/${inv.id}`);
      await notify({ type: "org", id: inv.orgId }, "worker_offboarded", `${worker.name} offboarded`, "Final settlement confirmed on-chain.", `/company/workers/${worker.id}`);
    }

    if (inv.lockExpired) {
      const lock = inv.lockedRate ? formatRate(inv.lockedRate, inv.currency) : "a fixed rate";
      const until = inv.lockExpiresAt ? ` until ${formatDateTime(inv.lockExpiresAt)}` : "";
      await notify(
        { type: "org", id: inv.orgId },
        "invoice_rate_lock_expired",
        "Rate lock expired, settled at market",
        `${fmtAmount(inv)} to ${worker.name} was locked at ${lock}${until}; it settled at the market rate ${formatRate(appliedRate, inv.currency)} instead.`,
        `/company/invoices/${inv.id}`,
      );
    }

    await Promise.all([
      notify(
        { type: "worker", id: worker.id },
        "invoice_settled",
        `You received ${formatUsdc(usdcAmount, worker.payoutPrefs.stablecoin)}`,
        `${fmtAmount(inv)} settled on-chain at ${formatRate(appliedRate, inv.currency)}.`,
        `/worker/invoices/${inv.id}`,
      ),
      notify(
        { type: "org", id: inv.orgId },
        "invoice_settled",
        `Settled ${formatUsdc(usdcAmount, worker.payoutPrefs.stablecoin)} to ${worker.name}`,
        `${fmtAmount(inv)} confirmed on-chain.`,
        `/company/invoices/${inv.id}`,
      ),
    ]);
    return inv;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    inv = transition(inv, "failed", SYSTEM, { error: message });
    await putInvoice(inv);
    await notify(
      { type: "org", id: inv.orgId },
      "invoice_failed",
      `Settlement failed for ${worker.name}`,
      message,
      `/company/invoices/${inv.id}`,
    );
    return inv;
  }
}
