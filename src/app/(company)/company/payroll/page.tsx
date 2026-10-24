import Link from "next/link";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { createPayrollRun } from "@/lib/actions/payroll";
import { listPayrollRunsByOrg } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function PayrollPage() {
  const s = await requireCompany();
  const [{ workers, invoices }, runs] = await Promise.all([companyContext(s.orgId), listPayrollRunsByOrg(s.orgId)]);
  const lastAmount = (workerId: string) => invoices.find((i) => i.workerId === workerId && i.status === "confirmed")?.amount ?? 1000;
  return (
    <Page title="Payroll" description="Pay everyone at once. Each transfer settles sequentially through the batch settlement contract.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">New payroll run</CardTitle>
            <CardDescription>Amounts are prefilled from each worker&apos;s last confirmed invoice. The rate option applies to every invoice in the run.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPayrollRun} className="space-y-3">
              <ul className="divide-y rounded-md border">
                {workers.map((w) => {
                  const ok = w.kyc.status === "verified";
                  return (
                    <li key={w.id} className="flex items-center gap-3 px-3 py-2">
                      <input type="checkbox" name="workerId" value={w.id} defaultChecked={ok} disabled={!ok} className="size-4 accent-emerald-500" aria-label={`Include ${w.name}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">{w.country} · {w.payoutPrefs.stablecoin} · {w.payoutPrefs.wallet === "external" ? "external wallet" : "Settlivo wallet"}{!ok && " · KYC pending"}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input name={`amount_${w.id}`} type="number" min="1" step="any" defaultValue={lastAmount(w.id)} className="h-8 w-32 text-right" disabled={!ok} />
                        <span className="w-10 text-xs text-muted-foreground">{w.localCurrency}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="grid gap-1.5 sm:max-w-sm">
                <Label htmlFor="payrollRateMode">Rate</Label>
                <select id="payrollRateMode" name="rateMode" defaultValue="spread" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="spread">Spread · market rate at send · 0.5% fee</option>
                  <option value="fixed">Fixed · lock today&apos;s rate for 24 h · 1.1% fee</option>
                </select>
              </div>
              <div className="flex justify-end"><Button type="submit">Run payroll now</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Past runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {runs.length === 0 && <p className="text-muted-foreground">No runs yet.</p>}
            {runs.map((r) => (
              <Link key={r.id} href={`/company/payroll/${r.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50">
                <span>{formatDateTime(r.createdAt)} · {r.invoiceIds.length} workers</span>
                <StatusBadge status={r.status === "completed" ? "completed" : r.status === "running" ? "processing" : "failed"} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
