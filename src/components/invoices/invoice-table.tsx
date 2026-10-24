import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money, Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Invoice, Worker } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

export function InvoiceTable({ invoices, workers, base, showWorker = true }: { invoices: Invoice[]; workers: Record<string, Worker>; base: "/company" | "/worker"; showWorker?: boolean }) {
  if (invoices.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No invoices yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showWorker && <TableHead>Worker</TableHead>}
          <TableHead>Memo</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Stablecoin</TableHead>
          <TableHead>Scheduled</TableHead>
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
              <TableCell className="max-w-[220px] truncate text-muted-foreground">
                <Link href={`${base}/invoices/${inv.id}`}>{inv.memo}</Link>
              </TableCell>
              <TableCell className="text-right"><Money amount={inv.amount} currency={inv.currency} /></TableCell>
              <TableCell className="text-right text-muted-foreground">{inv.usdcAmount ? <Usdc value={inv.usdcAmount} token={inv.stablecoin} /> : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(inv.scheduledAt)}</TableCell>
              <TableCell><StatusBadge status={inv.blockedReason ? "blocked" : inv.status} /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
