import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrefsDiff } from "@/components/approvals/prefs-diff";
import { submitPayoutPrefs } from "@/lib/actions/worker";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

export default async function SettingsPage() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return null;
  const { worker } = ctx;
  const p = worker.payoutPrefs;
  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return (
    <Page title="Payout settings" description="Changes take effect after your company approves them.">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-sm">How you get paid</CardTitle><CardDescription>Your Settlivo wallet: <span className="font-mono text-xs">{worker.platformWallet}</span></CardDescription></CardHeader>
          <CardContent>
            <form action={submitPayoutPrefs} className="grid gap-4">
              <div className="grid gap-1.5"><Label htmlFor="wallet">Receive to</Label>
                <select id="wallet" name="wallet" defaultValue={p.wallet} className={sel}><option value="platform">Settlivo wallet (custodial, no setup)</option><option value="external">My own wallet (self-custody)</option></select></div>
              <div className="grid gap-1.5"><Label htmlFor="externalAddress">External address (if self-custody)</Label><Input id="externalAddress" name="externalAddress" placeholder="0x…" defaultValue={p.externalAddress ?? ""} className="font-mono" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="stablecoin">Stablecoin</Label><select id="stablecoin" name="stablecoin" defaultValue={p.stablecoin} className={sel}><option>USDC</option><option>USDT</option></select></div>
                <div className="grid gap-1.5"><Label htmlFor="displayCurrency">Show amounts in</Label><select id="displayCurrency" name="displayCurrency" defaultValue={p.displayCurrency} className={sel}>{SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="grid gap-1.5"><Label htmlFor="cadence">Cadence</Label><select id="cadence" name="cadence" defaultValue={p.cadence} className={sel}><option value="monthly">Monthly</option><option value="biweekly">Bi-weekly</option><option value="per_invoice">Per invoice</option></select></div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="grid gap-1.5"><Label htmlFor="bankName">Bank (for withdrawals)</Label><Input id="bankName" name="bankName" defaultValue={p.bankAccount?.bankName ?? ""} placeholder="e.g. KB Kookmin" /></div>
                <div className="grid gap-1.5"><Label htmlFor="accountLast4">Account last 4</Label><Input id="accountLast4" name="accountLast4" maxLength={4} defaultValue={p.bankAccount?.accountMasked.slice(-4) ?? ""} className="w-24" /></div>
              </div>
              <p className="text-xs text-muted-foreground">USDC is the compliance default. USDT is available where local off-ramps prefer it.</p>
              <div className="flex justify-end"><Button type="submit">Submit for approval</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Pending change</CardTitle></CardHeader>
          <CardContent>
            {worker.pendingPayoutPrefs ? <PrefsDiff current={p} proposed={worker.pendingPayoutPrefs} /> : <p className="text-sm text-muted-foreground">No pending changes.</p>}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
