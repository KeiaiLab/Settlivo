import { createHook, sleep } from "workflow";
import { settleInvoice } from "@/lib/settlement/settle";
import { getInvoice } from "@/lib/db/repo";

async function loadInvoiceState(invoiceId: string) {
  "use step";
  const inv = await getInvoice(invoiceId);
  if (!inv) return null;
  return { status: inv.status, scheduledAt: inv.scheduledAt };
}

async function settleStep(invoiceId: string) {
  "use step";
  const inv = await settleInvoice(invoiceId);
  return inv.status;
}

export async function invoiceWorkflow(invoiceId: string) {
  "use workflow";
  const state = await loadInvoiceState(invoiceId);
  if (!state) return { status: "missing" };

  if (state.status === "pending_approval") {
    const hook = createHook<{ approved: boolean }>({ token: `approve:${invoiceId}` });
    const { approved } = await hook;
    if (!approved) return { status: "rejected" };
  } else if (state.status !== "scheduled") {
    return { status: state.status };
  }

  const due = new Date(state.scheduledAt);
  if (due.getTime() > Date.now()) await sleep(due);
  const status = await settleStep(invoiceId);
  return { status };
}
