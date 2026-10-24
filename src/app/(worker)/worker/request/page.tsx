import { AmountField } from "@/components/invoices/amount-field";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { Textarea } from "@/components/ui/textarea";
import { currentRates } from "@/lib/actions/invoices";
import { requestPayment } from "@/lib/actions/worker";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

export default async function RequestPage() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return null;
  const { worker, orgs } = ctx;
  const rates = await currentRates();
  return (
    <Page title="Request payment" description="Your company approves it, then it settles automatically at the time you choose.">
      <Card className="max-w-xl"><CardContent className="pt-6">
        <form action={requestPayment} className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="orgId">Company</Label>
            <select id="orgId" name="orgId" className="h-9 rounded-md border border-input bg-background px-3 text-sm">{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
          <AmountField
            label="Amount"
            currencies={SUPPORTED_CURRENCIES}
            defaultAmount={Math.round(1000 * rates.rates[worker.localCurrency])}
            defaultCurrency={worker.localCurrency}
            rates={rates.rates}
            stablecoin={worker.payoutPrefs.stablecoin}
          />
          <div className="grid gap-1.5"><Label htmlFor="scheduledAt">Preferred payout time</Label><LocalDateTime id="scheduledAt" name="scheduledAt" /></div>
          <div className="grid gap-1.5"><Label htmlFor="memo">What is it for?</Label><Textarea id="memo" name="memo" rows={2} defaultValue="Overtime: release weekend" /></div>
          <div className="flex justify-end"><Button type="submit">Send request</Button></div>
        </form>
      </CardContent></Card>
    </Page>
  );
}
