import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money, Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { badgeStatus } from "@/lib/domain/invoice-status";
import type { Invoice, Worker } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

/** `compact` drops the stablecoin column and tightens the memo so the table fits a dashboard card. */
export function InvoiceTable({ invoices, workers, base, showWorker = true, compact = false }: { invoices: Invoice[]; workers: Record<string, Worker>; base: "/company" | "/worker"; showWorker?: boolean; compact?: boolean }) {
  if (invoices.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No invoices yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showWorker && <TableHead>Worker</TableHead>}
          <TableHead>Memo</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {!compact && <TableHead className="hidden text-right sm:table-cell">Stablecoin</TableHead>}
          <TableHead className="hidden md:table-cell">Scheduled</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const w = workers[inv.workerId];
          return (
            <TableRow key={inv.id} className="cursor-pointer">
              {showWorker && (
                <TableCell>
                  <Link href={`${base}/invoices/${inv.id}`} className="font-medium hover:underline">{w?.name ?? inv.workerId}</Link>
                </TableCell>
              )}
              <TableCell className={compact ? "max-w-40 truncate text-muted-foreground" : "max-w-[220px] truncate text-muted-foreground"}>
                <Link href={`${base}/invoices/${inv.id}`}>{inv.memo}</Link>
                {inv.rateMode === "fixed" && <Badge variant="outline" className="ml-1.5 h-4 px-1.5 align-middle text-[10px] font-normal text-muted-foreground">Fixed</Badge>}
              </TableCell>
              <TableCell className="min-w-32"><Money amount={inv.amount} currency={inv.currency} justify /></TableCell>
              {!compact && <TableCell className="hidden min-w-32 text-muted-foreground sm:table-cell">{inv.usdcAmount ? <Usdc value={inv.usdcAmount} token={inv.stablecoin} justify /> : <span className="flex justify-end">—</span>}</TableCell>}
              <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(inv.scheduledAt)}</TableCell>
              <TableCell><StatusBadge status={badgeStatus(inv)} /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
