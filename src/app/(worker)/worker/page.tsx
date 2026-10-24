import { ArrowDownToLine, Clock } from "lucide-react";
import Link from "next/link";
import { ApproveButtons } from "@/components/invoices/approve-buttons";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money, Usdc } from "@/components/ui/money";
import { KycBanner } from "@/components/worker/kyc-banner";
import { approveMyInvoice } from "@/lib/actions/worker";
import { formatDateTime, formatRate, formatUsdc } from "@/lib/format";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

export default async function WorkerHome() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return <Page title="Worker not found"><p className="text-sm text-muted-foreground">Seed the database first.</p></Page>;
  const { worker, invoices, orgMap, balance, localBalance, rates } = ctx;
  const needsApproval = invoices.filter((i) => i.status === "pending_approval" && i.initiatedBy === "company");
  const upcoming = invoices.filter((i) => ["scheduled", "sending"].includes(i.status));
  const workerMap = { [worker.id]: worker };

  return (
    <Page title={`Hi, ${worker.name.split(" ")[0]}`} description={`${worker.country} · paid in ${worker.payoutPrefs.stablecoin} · shown in ${worker.localCurrency}`}>
      <KycBanner worker={worker} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 bg-emerald-500/5 ring-emerald-500/25">
          <CardHeader>
            <CardDescription>Available balance</CardDescription>
            <CardTitle className="py-1"><Money amount={localBalance} currency={worker.localCurrency} size="hero" /></CardTitle>
            <CardDescription className="flex flex-wrap items-baseline gap-x-1.5">
              <Usdc value={balance} token={worker.payoutPrefs.stablecoin} className="text-foreground" />
              <span>· {formatRate(rates.rates[worker.localCurrency], worker.localCurrency)}{rates.source === "fallback" && " · fallback rate"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/worker/withdraw" />}><ArrowDownToLine /> Withdraw to {worker.localCurrency}</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/worker/request" />}>Request payment</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Clock className="size-4" /> Upcoming</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcoming.length === 0 && <p className="text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.map((i) => (
              <Link key={i.id} href={`/worker/invoices/${i.id}`} className="block rounded-md border px-3 py-2 hover:bg-muted/50">
                <div className="flex justify-between"><span>{orgMap[i.orgId]?.name}</span><Money amount={i.amount} currency={i.currency} /></div>
                <div className="text-xs text-muted-foreground">{i.blockedReason ? "On hold until verified" : i.status === "sending" ? "Settling now…" : formatDateTime(i.scheduledAt)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {needsApproval.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Needs your approval ({needsApproval.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {needsApproval.map((inv) => (
              <Card key={inv.id}>
                <CardHeader>
                  <CardTitle className="text-sm"><Link href={`/worker/invoices/${inv.id}`} className="hover:underline">{orgMap[inv.orgId]?.name}</Link> · <Money amount={inv.amount} currency={inv.currency} /></CardTitle>
                  <CardDescription>{inv.memo} · settles {formatDateTime(inv.scheduledAt)} · ≈ {formatUsdc(inv.amount / inv.quoteRate, inv.stablecoin)} at today&apos;s rate</CardDescription>
                </CardHeader>
                <CardContent><ApproveButtons onDecide={async (a, r) => { "use server"; await approveMyInvoice(inv.id, a, r); }} /></CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Recent payouts</CardTitle></CardHeader>
        <CardContent className="px-0"><InvoiceTable invoices={invoices.filter((i) => i.status === "confirmed").slice(0, 8)} workers={workerMap} base="/worker" showWorker={false} /></CardContent>
      </Card>
    </Page>
  );
}
