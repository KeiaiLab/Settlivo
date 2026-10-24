import { PrefsDiff } from "@/components/approvals/prefs-diff";
import { Page } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWorkerWallet, respondLinkRequest, setPayoutWallet } from "@/lib/actions/wallets";
import { submitPayoutPrefs } from "@/lib/actions/worker";
import { SUPPORTED_CURRENCIES, type LinkRequest } from "@/lib/domain/types";
import { shortHash, timeAgo } from "@/lib/format";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

const KIND_LABEL: Record<LinkRequest["kind"], string> = { wallet: "wallet", bank: "bank account" };

export default async function SettingsPage() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return null;
  const { worker, wallets, payoutWallet, linkRequests, orgMap } = ctx;
  const p = worker.payoutPrefs;
  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  // Newest first from the repo; pending ones float to the top so open requests are never buried.
  const requests = [...linkRequests].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const addWalletForm = "grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end";
  return (
    <Page title="Settings" description="Wallets, requests from your companies and how you get paid. Payout changes take effect after your company approves them.">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Wallets</CardTitle>
            <CardDescription>Payouts go to the wallet marked Payout wallet. Changing it needs your company&apos;s approval.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="divide-y divide-border/60 rounded-md border" data-testid="wallet-list">
              {wallets.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No wallets yet.</li>}
              {wallets.map((w) => {
                const isPayout = w.id === payoutWallet?.id;
                const awaiting = !isPayout && worker.pendingPayoutPrefs?.walletId === w.id;
                return (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{w.label}</span>
                        <span className="text-xs text-muted-foreground">{w.kind === "platform" ? "Settlivo-custodied" : "External"} · {w.token}</span>
                      </div>
                      <div className="font-mono text-xs break-all text-muted-foreground" title={w.address}>{shortHash(w.address)}</div>
                    </div>
                    {isPayout ? (
                      <Badge variant="outline">Payout wallet</Badge>
                    ) : awaiting ? (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-300">Approval pending</Badge>
                    ) : (
                      <form action={async () => { "use server"; await setPayoutWallet(w.id); }}>
                        <Button type="submit" size="sm" variant="outline">Use for payouts</Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            <form action={addWorkerWallet} className={addWalletForm}>
              <div className="grid gap-1.5"><Label htmlFor="walletLabel">Label</Label><Input id="walletLabel" name="label" required placeholder="e.g. MetaMask" /></div>
              <div className="grid gap-1.5"><Label htmlFor="walletAddress">Address (optional)</Label><Input id="walletAddress" name="address" placeholder="0x…" className="font-mono" /></div>
              <Button type="submit">Add wallet</Button>
              <p className="text-xs text-muted-foreground sm:col-span-3">Leave blank to create a Settlivo-custodied wallet</p>
            </form>
          </CardContent>
        </Card>

        {requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Requests from your companies</CardTitle>
              <CardDescription>A company can ask you to link a wallet or a bank account for its payouts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {requests.map((lr) => {
                const orgName = orgMap[lr.orgId]?.name ?? "A company";
                const pending = lr.status === "pending";
                return (
                  <div key={lr.id} className="rounded-md border px-3 py-3" data-testid="link-request">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{orgName}</span>
                      <span className="text-xs text-muted-foreground">asks for a {KIND_LABEL[lr.kind]} · {timeAgo(lr.createdAt)}</span>
                      <Badge variant="outline" className="capitalize">{lr.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{lr.message}</p>
                    {pending && lr.kind === "wallet" && (
                      <div className="mt-3 grid gap-3">
                        <form action={addWorkerWallet} className={addWalletForm}>
                          <input type="hidden" name="linkRequestId" value={lr.id} />
                          <div className="grid gap-1.5"><Label htmlFor={`label-${lr.id}`}>Label</Label><Input id={`label-${lr.id}`} name="label" required placeholder="e.g. MetaMask" /></div>
                          <div className="grid gap-1.5"><Label htmlFor={`address-${lr.id}`}>Address (optional)</Label><Input id={`address-${lr.id}`} name="address" placeholder="0x…" className="font-mono" /></div>
                          <Button type="submit">Add wallet and accept</Button>
                        </form>
                        <form action={async () => { "use server"; await respondLinkRequest(lr.id, false); }}>
                          <Button type="submit" size="sm" variant="ghost">Decline</Button>
                        </form>
                      </div>
                    )}
                    {pending && lr.kind === "bank" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <form action={async () => { "use server"; await respondLinkRequest(lr.id, true); }}>
                          <Button type="submit" size="sm" disabled={!p.bankAccount}>Accept</Button>
                        </form>
                        <form action={async () => { "use server"; await respondLinkRequest(lr.id, false); }}>
                          <Button type="submit" size="sm" variant="outline">Decline</Button>
                        </form>
                        {!p.bankAccount && <span className="text-xs text-muted-foreground">Add your bank account below first</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="text-sm">How you get paid</CardTitle><CardDescription>Your Settlivo wallet: <span className="font-mono text-xs break-all">{worker.platformWallet}</span></CardDescription></CardHeader>
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
      </div>
    </Page>
  );
}
