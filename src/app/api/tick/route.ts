import { NextResponse } from "next/server";
import { listAllInvoices, listAllWithdrawals, putWithdrawal } from "@/lib/db/repo";
import { settleInvoice } from "@/lib/settlement/settle";
import { notify } from "@/lib/settlement/notify";


const WITHDRAWAL_COMPLETE_MS = 8_000;
/** In workflow mode the durable run settles on time; tick only rescues runs that are clearly late. */
const WORKFLOW_SAFETY_NET_MS = 45_000;

export async function GET() {
  const now = Date.now();
  const settled: string[] = [];
  const grace = process.env.SCHEDULER === "tick" ? 0 : WORKFLOW_SAFETY_NET_MS;
  const due = (await listAllInvoices()).filter(
    (i) => i.status === "scheduled" && !i.blockedReason && new Date(i.scheduledAt).getTime() + grace <= now,
  );
  for (const inv of due) {
    const result = await settleInvoice(inv.id);
    settled.push(`${inv.id}:${result.status}`);
  }

  const completed: string[] = [];
  for (const w of await listAllWithdrawals()) {
    if (w.status === "processing" && now - new Date(w.createdAt).getTime() >= WITHDRAWAL_COMPLETE_MS) {
      await putWithdrawal({ ...w, status: "completed", completedAt: new Date().toISOString() });
      await notify(
        { type: "worker", id: w.workerId },
        "withdrawal_completed",
        `Withdrawal completed: ${w.localAmount.toLocaleString("en-US")} ${w.currency}`,
        `Funds sent to ${w.bankAccountMasked}.`,
        "/worker/withdraw",
      );
      completed.push(w.id);
    }
  }

  return NextResponse.json({ settled, withdrawalsCompleted: completed });
}
