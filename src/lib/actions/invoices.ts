"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invoiceHash } from "@/lib/chain/memo";
import { getFxRates, getOrg, getWorker, putInvoice } from "@/lib/db/repo";
import { newId } from "@/lib/domain/ids";
import { SUPPORTED_CURRENCIES, type Currency, type Invoice } from "@/lib/domain/types";
import { getRates } from "@/lib/fx/rates";
import { approveInvoice, retryInvoice, scheduleInvoice } from "@/lib/scheduler";
import { notify } from "@/lib/settlement/notify";
import { requireCompany } from "@/lib/session";

function parseCurrency(v: unknown): Currency {
  const c = String(v) as Currency;
  if (!SUPPORTED_CURRENCIES.includes(c)) throw new Error(`Unsupported currency ${c}`);
  return c;
}

/** datetime-local (no tz) → ISO, treating input as local time of the server (demo only). */
function parseScheduledAt(v: unknown): string {
  const s = String(v ?? "");
  const d = s ? new Date(s) : new Date(Date.now() + 2 * 60_000);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid schedule time");
  return d.toISOString();
}

export async function currentRates() {
  return (await getFxRates()) ?? (await getRates());
}

export async function createInvoice(formData: FormData) {
  const s = await requireCompany();
  const workerId = String(formData.get("workerId"));
  const worker = await getWorker(workerId);
  const org = await getOrg(s.orgId);
  if (!worker || !org || !worker.orgIds.includes(s.orgId)) throw new Error("Worker not in organization");

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");
  const currency = parseCurrency(formData.get("currency"));
  const scheduledAt = parseScheduledAt(formData.get("scheduledAt"));
  const memo = String(formData.get("memo") ?? "").trim() || "Payment";
  const rates = await currentRates();

  const base = { id: newId("inv"), orgId: s.orgId, workerId, amount, currency, scheduledAt, memo };
  const now = new Date().toISOString();
  const inv: Invoice = {
    ...base,
    initiatedBy: "company",
    stablecoin: worker.payoutPrefs.stablecoin,
    status: "pending_approval",
    quoteRate: rates.rates[currency],
    invoiceHash: invoiceHash(base),
    history: [{ status: "pending_approval", at: now, by: `org:${s.orgId}` }],
    createdAt: now,
  };
  await putInvoice(inv);
  await notify(
    { type: "worker", id: workerId },
    "invoice_created",
    `New invoice from ${org.name}: ${amount.toLocaleString("en-US")} ${currency}`,
    `${memo} · scheduled ${new Date(scheduledAt).toLocaleString("en-US")}. Approve to receive it.`,
    `/worker/invoices/${inv.id}`,
  );
  await scheduleInvoice(inv.id);
  revalidatePath("/company");
  redirect(`/company/invoices/${inv.id}`);
}

export async function approveWorkerInvoice(id: string, approved: boolean, reason?: string) {
  const s = await requireCompany();
  await approveInvoice(id, `org:${s.orgId}`, approved, reason);
  revalidatePath("/company");
}

export async function retryInvoiceAction(id: string) {
  await requireCompany();
  await retryInvoice(id);
  revalidatePath(`/company/invoices/${id}`);
}
