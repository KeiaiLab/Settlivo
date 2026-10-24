import Link from "next/link";
import { notFound } from "next/navigation";
import { ApproveButtons } from "@/components/invoices/approve-buttons";
import { FxComparison } from "@/components/invoices/fx-comparison";
import { InvoiceTimeline } from "@/components/invoices/invoice-timeline";
import { OnchainRecord } from "@/components/invoices/onchain-record";
import { RetryButton } from "@/components/invoices/retry-button";
import { Page } from "@/components/shell/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { approveWorkerInvoice, retryInvoiceAction } from "@/lib/actions/invoices";
import { getInvoice, getTx, getWorker, listFxHistory } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { requireCompany } from "@/lib/session";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireCompany();
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv || inv.orgId !== s.orgId) notFound();
  const [worker, tx, history] = await Promise.all([getWorker(inv.workerId), inv.txId ? getTx(inv.txId) : null, listFxHistory(30)]);
  const canRetry = inv.status === "failed" || (inv.status === "scheduled" && inv.blockedReason && worker?.kyc.status === "verified");

  return (
    <Page
      title={inv.memo}
      description={<>{worker?.name} · <Money amount={inv.amount} currency={inv.currency} /> · settle {formatDateTime(inv.scheduledAt)}</> as unknown as string}
      actions={
        <>
          <StatusBadge status={inv.blockedReason ? "blocked" : inv.status} />
          {inv.status === "pending_approval" && inv.initiatedBy === "worker" && (
            <ApproveButtons onDecide={async (a, r) => { "use server"; await approveWorkerInvoice(id, a, r); }} />
          )}
          {canRetry && <RetryButton onRetry={async () => { "use server"; await retryInvoiceAction(id); }} />}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
          <CardContent><InvoiceTimeline invoice={inv} /></CardContent>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <FxComparison invoice={inv} history={history} />
          <OnchainRecord invoice={inv} tx={tx} />
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <dt className="text-muted-foreground">Invoice ID</dt><dd className="font-mono text-xs sm:col-span-2">{inv.id}</dd>
                <dt className="text-muted-foreground">Initiated by</dt><dd className="capitalize sm:col-span-2">{inv.initiatedBy}</dd>
                <dt className="text-muted-foreground">Worker</dt><dd className="sm:col-span-2"><Link href={`/company/workers/${inv.workerId}`} className="hover:underline">{worker?.name}</Link> · {worker?.country} · KYC {worker?.kyc.status}</dd>
                <dt className="text-muted-foreground">Payout to</dt><dd className="font-mono text-xs sm:col-span-2">{worker?.payoutPrefs.wallet === "external" ? worker.payoutPrefs.externalAddress : worker?.platformWallet} ({worker?.payoutPrefs.stablecoin})</dd>
                {inv.payrollRunId && <><dt className="text-muted-foreground">Payroll run</dt><dd className="sm:col-span-2"><Link href={`/company/payroll/${inv.payrollRunId}`} className="font-mono text-xs hover:underline">{inv.payrollRunId}</Link></dd></>}
                {inv.error && <><dt className="text-muted-foreground">Error</dt><dd className="text-rose-300 sm:col-span-2">{inv.error}</dd></>}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
