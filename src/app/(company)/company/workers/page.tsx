import Link from "next/link";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function WorkersPage() {
  const s = await requireCompany();
  const { workers, invoices } = await companyContext(s.orgId);
  return (
    <Page title="Workers" description={`${workers.length} people across ${new Set(workers.map((w) => w.country)).size} countries`}>
      <Card><CardContent className="px-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Payout</TableHead><TableHead>KYC</TableHead><TableHead className="text-right">Settlements</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {workers.map((w) => (
              <TableRow key={w.id}>
                <TableCell><Link href={`/company/workers/${w.id}`} className="font-medium hover:underline">{w.name}</Link><div className="text-xs text-muted-foreground">{w.email}</div></TableCell>
                <TableCell>{w.country} · {w.localCurrency}</TableCell>
                <TableCell className="text-muted-foreground">{w.payoutPrefs.stablecoin} · {w.payoutPrefs.wallet === "external" ? "external" : "Settlivo"} · {w.payoutPrefs.cadence.replace("_", " ")}</TableCell>
                <TableCell><StatusBadge status={w.kyc.status === "verified" ? "verified" : "pending"} /></TableCell>
                <TableCell className="text-right tabular-nums">{invoices.filter((i) => i.workerId === w.id && i.status === "confirmed").length}</TableCell>
                <TableCell className="text-right"><Button size="xs" variant="outline" render={<Link href={`/company/invoices/new?worker=${w.id}`} />}>Pay</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </Page>
  );
}
