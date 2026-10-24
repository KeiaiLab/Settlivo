import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { Textarea } from "@/components/ui/textarea";
import { requestPayment } from "@/lib/actions/worker";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

export default async function RequestPage() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return null;
  const { worker, orgs } = ctx;
  return (
    <Page title="Request payment" description="Your company approves it, then it settles automatically at the time you choose.">
      <Card className="max-w-xl"><CardContent className="pt-6">
        <form action={requestPayment} className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="orgId">Company</Label>
            <select id="orgId" name="orgId" className="h-9 rounded-md border border-input bg-background px-3 text-sm">{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="grid gap-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" name="amount" type="number" min="1" step="any" required defaultValue={1000} /></div>
            <div className="grid gap-1.5"><Label htmlFor="currency">Currency</Label>
              <select id="currency" name="currency" defaultValue={worker.localCurrency} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="scheduledAt">Preferred payout time</Label><LocalDateTime id="scheduledAt" name="scheduledAt" /></div>
          <div className="grid gap-1.5"><Label htmlFor="memo">What is it for?</Label><Textarea id="memo" name="memo" rows={2} defaultValue="Overtime: release weekend" /></div>
          <div className="flex justify-end"><Button type="submit">Send request</Button></div>
        </form>
      </CardContent></Card>
    </Page>
  );
}
