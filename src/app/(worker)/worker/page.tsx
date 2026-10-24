import { ArrowDownToLine, Clock } from "lucide-react";
import Link from "next/link";
import { ApproveButtons } from "@/components/invoices/approve-buttons";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { KycBanner } from "@/components/worker/kyc-banner";
import { approveMyInvoice } from "@/lib/actions/worker";
import { formatDateTime, formatMoney, formatUsdc } from "@/lib/format";
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
        <Card className="md:col-span-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardHeader>
            <CardDescription>Available balance</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{formatMoney(localBalance, worker.localCurrency)}</CardTitle>
            <CardDescription>{formatUsdc(balance, worker.payoutPrefs.stablecoin)} · {rates.rates[worker.localCurrency].toLocaleString("en-US", { maximumFractionDigits: 2 })} {worker.localCurrency}/USD {rates.source === "fallback" && "· fallback rate"}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button render={<Link href="/worker/withdraw" />}><ArrowDownToLine /> Withdraw to {worker.localCurrency}</Button>
            <Button variant="outline" render={<Link href="/worker/request" />}>Request payment</Button>
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
                  <CardDescription>{inv.memo} · settles {formatDateTime(inv.scheduledAt)} · ≈ {(inv.amount / inv.quoteRate).toLocaleString("en-US", { maximumFractionDigits: 2 })} {inv.stablecoin} at today's rate</CardDescription>
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
