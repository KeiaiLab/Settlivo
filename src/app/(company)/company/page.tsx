import { ArrowUpRight, Clock, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { SavingsWidget } from "@/components/dashboard/savings-widget";
import { StatCard } from "@/components/dashboard/stat-card";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { getChain } from "@/lib/chain";
import { companyContext, thisMonth } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function CompanyHome() {
  const s = await requireCompany();
  const { org, workers, invoices, workerMap } = await companyContext(s.orgId);
  if (!org) return <Page title="Organization not found"><p className="text-sm text-muted-foreground">Seed the database first.</p></Page>;
  const balance = await getChain().getBalance(org.walletAddress, "USDC");
  const confirmedThisMonth = invoices.filter((i) => i.status === "confirmed" && thisMonth(i.history.at(-1)?.at ?? i.createdAt));
  const paidThisMonth = confirmedThisMonth.reduce((sum, i) => sum + Number(i.usdcAmount ?? 0), 0);
  const pendingApprovals = workers.filter((w) => w.pendingPayoutPrefs).length + invoices.filter((i) => i.status === "pending_approval" && i.initiatedBy === "worker").length;
  const inFlight = invoices.filter((i) => ["scheduled", "sending"].includes(i.status));
  const period = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <Page
      title={org.name}
      description={`${org.country} · KYB ${org.kybStatus} · treasury ${org.walletAddress.slice(0, 10)}…`}
      actions={
        <>
          <Button variant="outline" nativeButton={false} render={<Link href="/company/payroll" />}>Run payroll</Button>
          <Button nativeButton={false} render={<Link href="/company/invoices/new" />}>New invoice <ArrowUpRight /></Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Treasury balance" value={<Usdc value={balance} />} hint="Base · USDC" icon={<Wallet className="size-5" />} />
        <StatCard label={`Paid in ${period}`} value={<Usdc value={paidThisMonth} />} hint={`${confirmedThisMonth.length} settlements`} icon={<ArrowUpRight className="size-5" />} />
        <StatCard label="In flight" value={inFlight.length} hint="scheduled or settling" icon={<Clock className="size-5" />} />
        <StatCard label="Workers" value={workers.length} hint={`${workers.filter((w) => w.kyc.status === "verified").length} verified`} icon={<Users className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Recent invoices</CardTitle>
              <Link href="/company/invoices" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
            </CardHeader>
            <CardContent className="px-0">
              <InvoiceTable invoices={invoices.slice(0, 8)} workers={workerMap} base="/company" compact />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <SavingsWidget confirmed={confirmedThisMonth} period={period} />
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Needs your attention</CardTitle>
              <Link href="/company/approvals" className="text-xs text-muted-foreground hover:text-foreground">Approvals ({pendingApprovals})</Link>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {inFlight.filter((i) => i.blockedReason).map((i) => (
                <Link key={i.id} href={`/company/invoices/${i.id}`} className="flex items-center justify-between rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 hover:bg-orange-500/10">
                  <span>{workerMap[i.workerId]?.name} · KYC pending</span><StatusBadge status="blocked" />
                </Link>
              ))}
              {workers.filter((w) => w.pendingPayoutPrefs).map((w) => (
                <Link key={w.id} href="/company/approvals" className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50">
                  <span>{w.name} changed payout settings</span><StatusBadge status="pending" />
                </Link>
              ))}
              {invoices.filter((i) => i.status === "pending_approval" && i.initiatedBy === "worker").map((i) => (
                <Link key={i.id} href="/company/approvals" className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50">
                  <span>{workerMap[i.workerId]?.name} requested payment</span><StatusBadge status="pending_approval" />
                </Link>
              ))}
              {pendingApprovals === 0 && inFlight.every((i) => !i.blockedReason) && <p className="text-muted-foreground">Nothing pending.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
