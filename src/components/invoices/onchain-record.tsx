import { ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decodeMemo, invoiceHash } from "@/lib/chain/memo";
import type { Invoice, Tx } from "@/lib/domain/types";
import { shortHash } from "@/lib/format";

export function OnchainRecord({ invoice, tx }: { invoice: Invoice; tx: Tx | null }) {
  if (!tx) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">On-chain record</CardTitle><CardDescription>Appears once settlement starts.</CardDescription></CardHeader>
      </Card>
    );
  }
  const memo = decodeMemo(tx.calldata);
  const recomputed = invoiceHash(invoice);
  const verified = !!memo && memo.invoiceId === invoice.id && memo.invoiceHash === recomputed;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>On-chain record</span>
          <span className={`flex items-center gap-1 text-xs font-medium ${verified ? "text-emerald-300" : "text-rose-300"}`}>
            {verified ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
            {verified ? "Verified" : "Mismatch"}
          </span>
        </CardTitle>
        <CardDescription>Invoice ID and SHA-256 hash are embedded in the transfer calldata.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Tx hash</dt>
          <dd className="font-mono text-xs">
            <Link href={tx.explorerUrl} target={tx.explorerUrl.startsWith("http") ? "_blank" : undefined} className="inline-flex items-center gap-1 hover:underline">
              {shortHash(tx.hash, 10)} <ExternalLink className="size-3" />
            </Link>
          </dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{tx.status}{tx.blockNumber ? ` · block ${tx.blockNumber.toLocaleString("en-US")}` : ""}</dd>
          <dt className="text-muted-foreground">Memo</dt>
          <dd className="font-mono text-xs break-all">{memo ? `SETTLIVO|${memo.invoiceId}|${shortHash(memo.invoiceHash, 8)}` : "none"}</dd>
          <dt className="text-muted-foreground">Invoice hash</dt>
          <dd className="font-mono text-xs break-all">{recomputed}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
