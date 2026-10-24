import { resumeHook, start } from "workflow/api";
import { getInvoice, getWorker, putInvoice } from "@/lib/db/repo";
import { transition } from "@/lib/domain/invoice-status";
import type { Invoice } from "@/lib/domain/types";
import { notify } from "@/lib/settlement/notify";
import { invoiceWorkflow } from "@/workflows/invoice";

export { computeDelayMs } from "./delay";

export function schedulerMode(): "workflow" | "tick" {
  return process.env.SCHEDULER === "tick" ? "tick" : "workflow";
}

export const approvalToken = (invoiceId: string) => `approve:${invoiceId}`;

/** Start the durable run for an invoice (workflow mode) or do nothing (tick mode). */
export async function scheduleInvoice(invoiceId: string): Promise<void> {
  if (schedulerMode() !== "workflow") return;
  await start(invoiceWorkflow, [invoiceId]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The run may not have reached createHook yet (cold start); retry briefly. */
async function resumeWithRetry(token: string, payload: { approved: boolean }, attempts = 6): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await resumeHook(token, payload);
      return true;
    } catch (err) {
      if (i === attempts - 1) console.warn("resumeHook failed", err instanceof Error ? err.message : err);
      await sleep(500);
    }
  }
  return false;
}

/** Idempotent: only acts when the invoice is pending_approval. */
export async function approveInvoice(
  invoiceId: string,
  by: string,
  approved: boolean,
  reason?: string,
): Promise<Invoice> {
  let inv = await getInvoice(invoiceId);
  if (!inv) throw new Error(`invoice ${invoiceId} not found`);
  if (inv.status !== "pending_approval") return inv;

  inv = approved
    ? transition(inv, "scheduled", by)
    : transition(inv, "rejected", by, { rejectReason: reason ?? "Rejected" });
  await putInvoice(inv);

  const worker = await getWorker(inv.workerId);
  const counterpart = inv.initiatedBy === "company" ? { type: "org" as const, id: inv.orgId } : { type: "worker" as const, id: inv.workerId };
  const href = counterpart.type === "org" ? `/company/invoices/${inv.id}` : `/worker/invoices/${inv.id}`;
  const label = `${inv.amount.toLocaleString("en-US")} ${inv.currency}`;
  await notify(
    counterpart,
    approved ? "invoice_approved" : "invoice_rejected",
    approved ? `Invoice approved: ${label}` : `Invoice rejected: ${label}`,
    approved
      ? `${worker?.name ?? "Worker"}'s invoice is scheduled for ${new Date(inv.scheduledAt).toLocaleString("en-US")}.`
      : `Reason: ${inv.rejectReason}`,
    href,
  );

  if (schedulerMode() === "workflow") {
    const delivered = await resumeWithRetry(approvalToken(inv.id), { approved });
    // No hook (seeded invoice never started, or run not suspended yet): a fresh run takes the `scheduled` branch.
    if (!delivered && approved) await scheduleInvoice(inv.id);
  }
  return inv;
}

/** failed or blocked → scheduled now, and re-schedule. */
export async function retryInvoice(invoiceId: string): Promise<Invoice> {
  let inv = await getInvoice(invoiceId);
  if (!inv) throw new Error(`invoice ${invoiceId} not found`);
  const now = new Date().toISOString();
  if (inv.status === "failed") {
    inv = transition(inv, "scheduled", "system:retry", { scheduledAt: now, error: undefined });
  } else if (inv.status === "scheduled" && inv.blockedReason) {
    inv = { ...inv, blockedReason: undefined, scheduledAt: now };
  } else {
    return inv;
  }
  await putInvoice(inv);
  await scheduleInvoice(inv.id);
  return inv;
}
