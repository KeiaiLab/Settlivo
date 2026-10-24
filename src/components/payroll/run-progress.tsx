import Link from "next/link";
import { Money, Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { badgeStatus } from "@/lib/domain/invoice-status";
import type { Invoice, Worker } from "@/lib/domain/types";

export function RunProgress({ invoices, workers }: { invoices: Invoice[]; workers: Record<string, Worker> }) {
  return (
    <ol className="divide-y divide-border rounded-lg border">
      {invoices.map((inv, i) => {
        const w = workers[inv.workerId];
        return (
          <li key={inv.id} className="flex items-center gap-4 px-4 py-3">
            <span className="grid size-6 place-items-center rounded-full bg-muted text-xs">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link href={`/company/invoices/${inv.id}`} className="block truncate text-sm font-medium hover:underline">{w?.name ?? inv.workerId}</Link>
              <div className="text-xs text-muted-foreground"><Money amount={inv.amount} currency={inv.currency} />{inv.usdcAmount && <> → <Usdc value={inv.usdcAmount} token={inv.stablecoin} /></>}</div>
            </div>
            <StatusBadge status={badgeStatus(inv)} />
          </li>
        );
      })}
    </ol>
  );
}
