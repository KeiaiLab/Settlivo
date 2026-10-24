import { NextResponse } from "next/server";
import { listAllInvoices, listAllWithdrawals, putWithdrawal } from "@/lib/db/repo";
import { settleInvoice } from "@/lib/settlement/settle";
import { notify } from "@/lib/settlement/notify";
import { formatMoney } from "@/lib/format";


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
  // One settlement per poll: a payroll batch then confirms row by row (§5.5) instead of freezing the page.
  const next = due.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  if (next) {
    const result = await settleInvoice(next.id);
    settled.push(`${next.id}:${result.status}`);
  }

  const completed: string[] = [];
  for (const w of await listAllWithdrawals()) {
    if (w.status === "processing" && now - new Date(w.createdAt).getTime() >= WITHDRAWAL_COMPLETE_MS) {
      await putWithdrawal({ ...w, status: "completed", completedAt: new Date().toISOString() });
      await notify(
        { type: "worker", id: w.workerId },
        "withdrawal_completed",
        `Withdrawal completed: ${formatMoney(w.localAmount, w.currency)}`,
        `Funds sent to ${w.bankAccountMasked}.`,
        "/worker/withdraw",
      );
      completed.push(w.id);
    }
  }

  return NextResponse.json({ settled, withdrawalsCompleted: completed });
}
