"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invoiceHash } from "@/lib/chain/memo";
import { getWorker, putInvoice, putPayrollRun } from "@/lib/db/repo";
import { newId } from "@/lib/domain/ids";
import type { Invoice, PayrollRun } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { scheduleInvoice } from "@/lib/scheduler";
import { notify } from "@/lib/settlement/notify";
import { requireCompany } from "@/lib/session";
import { currentRates } from "./invoices";

/** Spec §5.5: company batch, pre-approved, scheduledAt = now. */
export async function createPayrollRun(formData: FormData) {
  const s = await requireCompany();
  const selected = formData.getAll("workerId").map(String);
  if (selected.length === 0) throw new Error("Select at least one worker");
  const rates = await currentRates();
  const now = new Date().toISOString();
  const runId = newId("run");
  const invoiceIds: string[] = [];

  for (const workerId of selected) {
    const worker = await getWorker(workerId);
    if (!worker || !worker.orgIds.includes(s.orgId)) continue;
    const amount = Number(formData.get(`amount_${workerId}`));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const base = { id: newId("inv"), orgId: s.orgId, workerId, amount, currency: worker.localCurrency, scheduledAt: now, memo: "Payroll run" };
    const inv: Invoice = {
      ...base,
      initiatedBy: "company",
      stablecoin: worker.payoutPrefs.stablecoin,
      status: "scheduled",
      quoteRate: rates.rates[worker.localCurrency],
      invoiceHash: invoiceHash(base),
      payrollRunId: runId,
      history: [{ status: "scheduled", at: now, by: `org:${s.orgId}`, note: "Payroll run" }],
      createdAt: now,
    };
    await putInvoice(inv);
    invoiceIds.push(inv.id);
  }
  const run: PayrollRun = { id: runId, orgId: s.orgId, invoiceIds, status: "running", createdAt: now };
  await putPayrollRun(run);
  for (const id of invoiceIds) await scheduleInvoice(id);
  await Promise.all(
    invoiceIds.map(async (id) => {
      const inv = (await import("@/lib/db/repo")).getInvoice(id);
      const i = await inv;
      if (i) await notify({ type: "worker", id: i.workerId }, "invoice_scheduled", `Payroll on its way: ${formatMoney(i.amount, i.currency)}`, "Batch settlement started.", `/worker/invoices/${i.id}`);
    }),
  );
  revalidatePath("/company/payroll");
  redirect(`/company/payroll/${runId}`);
}
