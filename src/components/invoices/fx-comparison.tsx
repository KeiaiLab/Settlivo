import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Usdc } from "@/components/ui/money";
import type { FxHistoryPoint, Invoice } from "@/lib/domain/types";
import { formatRate } from "@/lib/format";
import { Sparkline } from "./sparkline";

export function FxComparison({ invoice, history }: { invoice: Invoice; history: FxHistoryPoint[] }) {
  const series = [...history].reverse().map((p) => p.rates[invoice.currency]).filter((n) => typeof n === "number");
  const delta = invoice.executedRate ? ((invoice.executedRate - invoice.quoteRate) / invoice.quoteRate) * 100 : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">FX & settlement amount</CardTitle>
        <CardDescription>Rate is locked at send time, not at invoice time.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Quote rate (at issue)</dt>
          <dd className="tabular-nums">{formatRate(invoice.quoteRate, invoice.currency)}</dd>
          <dt className="text-muted-foreground">Executed rate (at send)</dt>
          <dd className="tabular-nums">{invoice.executedRate ? formatRate(invoice.executedRate, invoice.currency) : <span className="text-muted-foreground">pending</span>}</dd>
          <dt className="text-muted-foreground">Change</dt>
          <dd className={delta === null ? "text-muted-foreground" : delta <= 0 ? "text-emerald-300" : "text-rose-300"}>
            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(3)}%`}
          </dd>
          <dt className="text-muted-foreground">Settled amount</dt>
          <dd>{invoice.usdcAmount ? <Usdc value={invoice.usdcAmount} token={invoice.stablecoin} exact className="font-medium" /> : <span className="text-muted-foreground">—</span>}</dd>
        </dl>
        <div className="text-xs text-muted-foreground">
          <div className="mb-1">30-day {invoice.currency}/USD</div>
          <Sparkline values={series} label={`${invoice.currency} per USD over the last 30 days`} />
        </div>
      </CardContent>
    </Card>
  );
}
