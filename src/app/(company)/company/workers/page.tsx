import Link from "next/link";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registerWorker } from "@/lib/actions/workers";
import { membershipFor } from "@/lib/domain/membership";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function WorkersPage() {
  const s = await requireCompany();
  const { workers, formerWorkers, invoices } = await companyContext(s.orgId);
  const settlements = (workerId: string) => invoices.filter((i) => i.workerId === workerId && i.status === "confirmed").length;
  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return (
    <Page title="Workers" description={`${workers.length} people across ${new Set(workers.map((w) => w.country)).size} countries`}>
      <Card><CardContent className="px-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Payout</TableHead><TableHead>KYC</TableHead><TableHead className="hidden md:table-cell">Since</TableHead><TableHead className="text-right">Settlements</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {workers.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No workers yet.</TableCell></TableRow>}
            {workers.map((w) => (
              <TableRow key={w.id}>
                <TableCell><Link href={`/company/workers/${w.id}`} className="font-medium hover:underline">{w.name}</Link><div className="text-xs text-muted-foreground">{w.email}</div></TableCell>
                <TableCell>{w.country} · {w.localCurrency}</TableCell>
                <TableCell className="text-muted-foreground">{w.payoutPrefs.stablecoin} · {w.payoutPrefs.wallet === "external" ? "external" : "Settlivo"} · {w.payoutPrefs.cadence.replace("_", " ")}</TableCell>
                <TableCell><StatusBadge status={w.kyc.status === "verified" ? "verified" : "pending"} /></TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(membershipFor(w, s.orgId)?.joinedAt ?? w.createdAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{settlements(w.id)}</TableCell>
                <TableCell className="text-right"><Button size="xs" variant="outline" nativeButton={false} render={<Link href={`/company/invoices/new?worker=${w.id}`} />}>Pay</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add worker</CardTitle>
            <CardDescription>They get an invitation and finish verification before their first payout.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={registerWorker} className="grid gap-4">
              <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required placeholder="Full name" /></div>
              <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="name@company.com" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="country">Country</Label><Input id="country" name="country" maxLength={2} defaultValue="US" /></div>
                <div className="grid gap-1.5"><Label htmlFor="localCurrency">Local currency</Label><select id="localCurrency" name="localCurrency" defaultValue="USD" className={sel}>{SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="grid gap-1.5"><Label htmlFor="stablecoin">Stablecoin</Label><select id="stablecoin" name="stablecoin" defaultValue="USDC" className={sel}><option>USDC</option><option>USDT</option></select></div>
              </div>
              <div className="flex justify-end"><Button type="submit">Add worker</Button></div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Former workers ({formerWorkers.length})</h2>
          {formerWorkers.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <Card><CardContent className="px-0">
              <ul className="divide-y">
                {formerWorkers.map((w) => {
                  const m = membershipFor(w, s.orgId);
                  return (
                    <li key={w.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                      <div>
                        <Link href={`/company/workers/${w.id}`} className="font-medium hover:underline">{w.name}</Link>
                        <div className="text-xs text-muted-foreground">{w.country} · {w.localCurrency}{m?.leftAt && ` · Left ${formatDateTime(m.leftAt)}`}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{plural(settlements(w.id), "settlement")}</span>
                        <StatusBadge status="former" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent></Card>
          )}
        </section>
      </div>
    </Page>
  );
}
