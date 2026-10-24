import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { offboardWorker, removeWorker, requestLink } from "@/lib/actions/workers";
import { getChain } from "@/lib/chain";
import { getWorker, listWalletsByOwner } from "@/lib/db/repo";
import { membershipFor, openInvoices } from "@/lib/domain/membership";
import type { Membership } from "@/lib/domain/types";
import { defaultWallet } from "@/lib/domain/wallets";
import { formatDateTime, shortHash } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

const MEMBERSHIP_BADGE: Record<Membership["status"], "active" | "offboarding" | "former"> = { active: "active", offboarding: "offboarding", offboarded: "former" };

export default async function WorkerProfile({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireCompany();
  const { id } = await params;
  const w = await getWorker(id);
  const membership = w ? membershipFor(w, s.orgId) : undefined;
  if (!w || !membership) notFound();
  const [{ invoices, workerMap, linkRequests }, wallets] = await Promise.all([companyContext(s.orgId), listWalletsByOwner({ type: "worker", id })]);
  const chain = getChain();
  const balances = await Promise.all(wallets.map((wal) => chain.getBalance(wal.address, wal.token)));
  const payout = defaultWallet(wallets);
  const mine = invoices.filter((i) => i.workerId === id);
  const open = openInvoices(invoices, id, s.orgId);
  // Invoices arrive newest first; prefill the final payment from the latest confirmed one in the worker's currency.
  const lastConfirmed = mine.find((i) => i.status === "confirmed" && i.currency === w.localCurrency);
  const requests = linkRequests.filter((r) => r.workerId === id);
  const active = membership.status === "active";
  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <Page
      title={w.name}
      description={`${w.email} · ${w.country} · ${w.localCurrency}`}
      actions={
        <>
          <StatusBadge status={MEMBERSHIP_BADGE[membership.status]} />
          {active && <Button nativeButton={false} render={<Link href={`/company/invoices/new?worker=${w.id}`} />}>New invoice</Button>}
        </>
      }
    >
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

        <Card>
          <CardHeader><CardTitle className="text-sm">Wallets</CardTitle></CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wallets yet.</p>
            ) : (
              <ul className="divide-y">
                {wallets.map((wal, i) => (
                  <li key={wal.id} className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{wal.label}</span>
                        {payout?.id === wal.id && <Badge variant="outline">Payout wallet</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{wal.kind}{wal.status === "revoked" && " · revoked"} · <span className="font-mono" title={wal.address}>{shortHash(wal.address)}</span></div>
                    </div>
                    <Usdc value={balances[i]} token={wal.token} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Link requests</CardTitle>
            <CardDescription>Ask for a wallet or a bank account; the worker answers from their settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.kind === "bank" ? "Bank account" : "Wallet"}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-muted-foreground">{r.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Sent {formatDateTime(r.createdAt)}{r.resolvedAt && ` · answered ${formatDateTime(r.resolvedAt)}`}</p>
                  </li>
                ))}
              </ul>
            )}
            {active && (
              <form action={requestLink} className="grid gap-3 border-t pt-4">
                <input type="hidden" name="workerId" value={id} />
                <div className="grid gap-1.5">
                  <Label htmlFor="kind">Request</Label>
                  <select id="kind" name="kind" defaultValue="wallet" className={sel}>
                    <option value="wallet">A wallet</option>
                    <option value="bank">A bank account</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={2} placeholder="Optional note for the worker" />
                </div>
                <div className="flex justify-end"><Button type="submit" size="sm">Send request</Button></div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader>
          <CardContent className="px-0"><InvoiceTable invoices={mine} workers={workerMap} base="/company" showWorker={false} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Offboarding</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {membership.status === "offboarded" && (
              <p className="text-muted-foreground">{membership.leftAt ? `Left on ${formatDateTime(membership.leftAt)}` : "No longer on the team."}</p>
            )}
            {membership.status === "offboarding" && (
              <p>
                Final settlement in progress
                {membership.finalInvoiceId && <> · <Link href={`/company/invoices/${membership.finalInvoiceId}`} className="underline">view the final invoice</Link></>}
              </p>
            )}
            {active && (
              <>
                <p className="text-muted-foreground">Pay a final settlement now, then the membership closes once it confirms.</p>
                <form action={offboardWorker} className="grid gap-3">
                  <input type="hidden" name="workerId" value={id} />
                  <div className="grid gap-1.5">
                    <Label htmlFor="finalAmount">Final payment ({w.localCurrency})</Label>
                    <Input id="finalAmount" name="finalAmount" type="number" min={0} step="any" defaultValue={lastConfirmed?.amount ?? 0} className="tabular-nums" />
                  </div>
                  <div className="flex justify-end"><Button type="submit" variant="destructive">Offboard</Button></div>
                </form>
                <form action={async () => { "use server"; await removeWorker(id); }} className="border-t pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p>Remove without a final payment.</p>
                      {open.length > 0 && <p className="text-xs text-muted-foreground">Settle or reject {open.length} open invoice{open.length === 1 ? "" : "s"} first.</p>}
                    </div>
                    <Button type="submit" variant="outline" disabled={open.length > 0}>Remove from team</Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
