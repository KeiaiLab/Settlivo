import Link from "next/link";
import { PrefsDiff } from "@/components/approvals/prefs-diff";
import { ApproveButtons } from "@/components/invoices/approve-buttons";
import { Page } from "@/components/shell/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { approvePayoutPrefs } from "@/lib/actions/approvals";
import { approveWorkerInvoice } from "@/lib/actions/invoices";
import { formatDateTime, timeAgo } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function ApprovalsPage() {
  const s = await requireCompany();
  const { workers, invoices, workerMap } = await companyContext(s.orgId);
  const prefChanges = workers.filter((w) => w.pendingPayoutPrefs);
  const requests = invoices.filter((i) => i.status === "pending_approval" && i.initiatedBy === "worker");
  return (
    <Page title="Approvals" description="Requests from workers that need a company decision.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Payment requests ({requests.length})</h2>
          {requests.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {requests.map((inv) => (
            <Card key={inv.id}>
              <CardHeader>
                <CardTitle className="text-sm"><Link href={`/company/invoices/${inv.id}`} className="hover:underline">{workerMap[inv.workerId]?.name}</Link> · <Money amount={inv.amount} currency={inv.currency} /></CardTitle>
                <CardDescription>{inv.memo} · wants it {formatDateTime(inv.scheduledAt)} · requested {timeAgo(inv.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ApproveButtons approveLabel="Approve & schedule" onDecide={async (a, r) => { "use server"; await approveWorkerInvoice(inv.id, a, r); }} />
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Payout setting changes ({prefChanges.length})</h2>
          {prefChanges.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {prefChanges.map((w) => (
            <Card key={w.id}>
              <CardHeader>
                <CardTitle className="text-sm"><Link href={`/company/workers/${w.id}`} className="hover:underline">{w.name}</Link></CardTitle>
                <CardDescription>Submitted {timeAgo(w.pendingPayoutPrefs!.submittedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PrefsDiff current={w.payoutPrefs} proposed={w.pendingPayoutPrefs!} />
                <ApproveButtons onDecide={async (a, r) => { "use server"; await approvePayoutPrefs(w.id, a, r); }} />
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </Page>
  );
}
