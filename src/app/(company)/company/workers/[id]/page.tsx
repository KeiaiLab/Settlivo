import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getWorker } from "@/lib/db/repo";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function WorkerProfile({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireCompany();
  const { id } = await params;
  const w = await getWorker(id);
  if (!w || !w.orgIds.includes(s.orgId)) notFound();
  const { invoices, workerMap } = await companyContext(s.orgId);
  const mine = invoices.filter((i) => i.workerId === id);
  return (
    <Page title={w.name} description={`${w.email} · ${w.country} · ${w.localCurrency}`} actions={<Button render={<Link href={`/company/invoices/new?worker=${w.id}`} />}>New invoice</Button>}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Payout settings</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">KYC</dt><dd><StatusBadge status={w.kyc.status === "verified" ? "verified" : "pending"} /></dd>
              <dt className="text-muted-foreground">Wallet</dt><dd className="font-mono text-xs break-all">{w.payoutPrefs.wallet === "external" ? w.payoutPrefs.externalAddress : w.platformWallet}</dd>
              <dt className="text-muted-foreground">Stablecoin</dt><dd>{w.payoutPrefs.stablecoin}</dd>
              <dt className="text-muted-foreground">Cadence</dt><dd className="capitalize">{w.payoutPrefs.cadence.replace("_", " ")}</dd>
              <dt className="text-muted-foreground">Bank</dt><dd>{w.payoutPrefs.bankAccount ? `${w.payoutPrefs.bankAccount.bankName} ${w.payoutPrefs.bankAccount.accountMasked}` : "—"}</dd>
            </dl>
            {w.pendingPayoutPrefs && <p className="mt-3 text-xs text-amber-300">Pending change awaiting <Link href="/company/approvals" className="underline">approval</Link>.</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader>
          <CardContent className="px-0"><InvoiceTable invoices={mine} workers={workerMap} base="/company" showWorker={false} /></CardContent>
        </Card>
      </div>
    </Page>
  );
}
