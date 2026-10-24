import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice, currentRates } from "@/lib/actions/invoices";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { formatRate } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ worker?: string }> }) {
  const s = await requireCompany();
  const { worker: preselected } = await searchParams;
  const { workers } = await companyContext(s.orgId);
  const rates = await currentRates();
  const first = workers.find((w) => w.id === preselected) ?? workers[0];
  return (
    <Page title="New invoice" description="The worker approves, then settlement runs automatically at the scheduled time.">
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <form action={createInvoice} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="workerId">Worker</Label>
              <select id="workerId" name="workerId" defaultValue={first?.id} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.country} · {w.localCurrency}{w.kyc.status !== "verified" ? " · KYC pending" : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Amount (local currency)</Label>
                <Input id="amount" name="amount" type="number" min="1" step="any" required defaultValue={first ? Math.round(1000 * rates.rates[first.localCurrency]) : 1000} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" name="currency" defaultValue={first?.localCurrency ?? "USD"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="scheduledAt">Settle at</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={localDateTime(new Date(Date.now() + 2 * 60_000))} />
              <p className="text-xs text-muted-foreground">Default is two minutes from now so you can watch it settle.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="memo">Memo</Label>
              <Textarea id="memo" name="memo" rows={2} defaultValue="Monthly salary" />
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Indicative rates ({rates.source}): {SUPPORTED_CURRENCIES.filter((c) => c !== "USD").map((c) => formatRate(rates.rates[c], c)).join(" · ")}. The final USDC amount is fixed at send time.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit">Issue invoice</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
