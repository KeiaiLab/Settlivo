import { getChain, chainMode } from "@/lib/chain";
import { getInvoice, getWorker, putFxRates, putInvoice, pushFxHistory } from "@/lib/db/repo";
import { transition } from "@/lib/domain/invoice-status";
import type { Invoice, Worker } from "@/lib/domain/types";
import { toUsdc } from "@/lib/fx/convert";
import { getRates } from "@/lib/fx/rates";
import { notify } from "./notify";

const SYSTEM = "system:settlement";

function activeWallet(w: Worker): string {
  return w.payoutPrefs.wallet === "external" && w.payoutPrefs.externalAddress
    ? w.payoutPrefs.externalAddress
    : w.platformWallet;
}

const fmtAmount = (inv: Invoice) => `${inv.amount.toLocaleString("en-US")} ${inv.currency}`;

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

  inv = transition(inv, "sending", SYSTEM, { blockedReason: undefined });
  await putInvoice(inv);

  try {
    const rates = await getRates({ drift: chainMode() === "simulated" });
    await putFxRates(rates);
    await pushFxHistory({ at: rates.fetchedAt, rates: rates.rates });
    const executedRate = rates.rates[inv.currency];
    const usdcAmount = toUsdc(inv.amount, inv.currency, rates);

    const chain = getChain();
    const tx = await chain.transfer({
      token: worker.payoutPrefs.stablecoin,
      to: activeWallet(worker),
      amount: usdcAmount,
      memo: { invoiceId: inv.id, invoiceHash: inv.invoiceHash },
    });
    inv = { ...inv, txId: tx.id, executedRate, usdcAmount };
    await putInvoice(inv);

    await chain.waitForConfirmation(tx.id);
    inv = transition(inv, "confirmed", SYSTEM);
    await putInvoice(inv);

    await Promise.all([
      notify(
        { type: "worker", id: worker.id },
        "invoice_settled",
        `You received ${usdcAmount} ${worker.payoutPrefs.stablecoin}`,
        `${fmtAmount(inv)} settled on-chain at ${executedRate} ${inv.currency}/USD.`,
        `/worker/invoices/${inv.id}`,
      ),
      notify(
        { type: "org", id: inv.orgId },
        "invoice_settled",
        `Settled ${usdcAmount} ${worker.payoutPrefs.stablecoin} to ${worker.name}`,
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
