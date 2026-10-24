import { notFound } from "next/navigation";
import { ApproveButtons } from "@/components/invoices/approve-buttons";
import { FxComparison } from "@/components/invoices/fx-comparison";
import { InvoiceTimeline } from "@/components/invoices/invoice-timeline";
import { OnchainRecord } from "@/components/invoices/onchain-record";
import { Page } from "@/components/shell/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { approveMyInvoice } from "@/lib/actions/worker";
import { getInvoice, getOrg, getTx, getWorker, listFxHistory } from "@/lib/db/repo";
import { badgeStatus } from "@/lib/domain/invoice-status";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireWorker } from "@/lib/session";

export default async function WorkerInvoice({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireWorker();
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv || inv.workerId !== s.workerId) notFound();
  const [org, tx, history] = await Promise.all([getOrg(inv.orgId), inv.txId ? getTx(inv.txId) : null, listFxHistory(30)]);
  return (
    <Page
      title={inv.memo}
      description={`${org?.name} · ${formatMoney(inv.amount, inv.currency)} · settles ${formatDateTime(inv.scheduledAt)}`}
      actions={
        <>
          <StatusBadge status={badgeStatus(inv)} />
          {inv.status === "pending_approval" && inv.initiatedBy === "company" && <ApproveButtons onDecide={async (a, r) => { "use server"; await approveMyInvoice(id, a, r); }} />}
        </>
      }
    >
      {inv.blockedReason === "kyc" && <p className="mb-4 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm">{(await getWorker(inv.workerId))?.kyc.status === "verified" ? "You are verified. Your company can retry this payout now." : "Payout blocked until verification is complete."}</p>}
      {inv.blockedReason === "plan" && <p className="mb-4 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm" data-testid="plan-notice">Your company&apos;s plan limit is holding this payout. It resumes as soon as they upgrade or the month renews.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader><CardContent><InvoiceTimeline invoice={inv} /></CardContent></Card>
        <div className="space-y-4 lg:col-span-2">
          <FxComparison invoice={inv} history={history} />
          <OnchainRecord invoice={inv} tx={tx} />
        </div>
      </div>
    </Page>
  );
}
