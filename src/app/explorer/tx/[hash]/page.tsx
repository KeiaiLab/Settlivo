import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { chainMode } from "@/lib/chain";
import { decodeMemo } from "@/lib/chain/memo";
import { getTxByHash } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function ExplorerTx({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (chainMode() === "testnet") redirect(`https://sepolia.basescan.org/tx/${hash}`);
  const tx = await getTxByHash(hash);
  if (!tx) notFound();
  const memo = decodeMemo(tx.calldata);
  const session = await getSession();
  const invoiceBase = session?.role === "worker" ? "/worker/invoices" : "/company/invoices";
  const row = (k: string, v: React.ReactNode) => (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 py-2.5 text-sm last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-all">{v}</dd>
    </div>
  );
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo /><span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Explorer · Base (simulated)</span></div>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Back to app</Link>
      </header>
      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between text-sm"><span>Transaction details</span><StatusBadge status={tx.status === "confirmed" ? "confirmed" : tx.status === "failed" ? "failed" : "processing"} /></CardTitle></CardHeader>
        <CardContent>
          <dl>
            {row("Transaction hash", <span className="font-mono text-xs">{tx.hash}</span>)}
            {row("Block", tx.blockNumber ? tx.blockNumber.toLocaleString("en-US") : "pending")}
            {row("Timestamp", `${formatDateTime(tx.confirmedAt ?? tx.createdAt)}${tx.confirmedAt ? "" : " (submitted)"}`)}
            {row("From", <span className="font-mono text-xs">{tx.from} <span className="text-muted-foreground">(Settlivo treasury)</span></span>)}
            {row("To", <span className="font-mono text-xs">{tx.to}</span>)}
            {row("Token transfer", <span className="flex flex-wrap items-center gap-2"><Usdc value={tx.amount} token={tx.token} className="font-medium" /><ArrowRight className="size-3 text-muted-foreground" /><span className="text-muted-foreground">ERC-20 transfer via {tx.token} contract</span></span>)}
            {row("Gas used", tx.gasUsed ? `${tx.gasUsed.toLocaleString("en-US")} · ~$0.002` : "—")}
            {row("Method", <span className="font-mono text-xs">transfer(address,uint256) + memo</span>)}
          </dl>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-sm">Input data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{tx.calldata}</pre>
          {memo ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <div className="mb-1 text-sm font-medium text-emerald-300">Decoded Settlivo memo</div>
              <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-xs">
                <dt className="text-muted-foreground">Invoice</dt><dd className="font-mono"><Link href={`${invoiceBase}/${memo.invoiceId}`} className="hover:underline">{memo.invoiceId}</Link></dd>
                <dt className="text-muted-foreground">Invoice hash</dt><dd className="font-mono break-all">{memo.invoiceHash}</dd>
              </dl>
            </div>
          ) : <p className="text-sm text-muted-foreground">No memo in this transaction.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
