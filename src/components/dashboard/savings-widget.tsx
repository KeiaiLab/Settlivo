import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Invoice } from "@/lib/domain/types";

export const BANK_FIXED_FEE_USD = 35;
export const BANK_FX_SPREAD = 0.022;
export const BANK_DAYS = 4;
export const SETTLIVO_FEE = 0.005;

export function computeSavings(confirmed: Invoice[]) {
  const totalUsd = confirmed.reduce((s, i) => s + Number(i.usdcAmount ?? 0), 0);
  const bankCost = confirmed.length * BANK_FIXED_FEE_USD + totalUsd * BANK_FX_SPREAD;
  const settlivoCost = totalUsd * SETTLIVO_FEE;
  return { count: confirmed.length, totalUsd, bankCost, settlivoCost, saved: bankCost - settlivoCost, daysSaved: confirmed.length * BANK_DAYS };
}

export function SavingsWidget({ confirmed, period }: { confirmed: Invoice[]; period: string }) {
  const s = computeSavings(confirmed);
  const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="text-sm">Saved vs. bank wires · {period}</CardTitle>
        <CardDescription>{s.count} settlements · {money(s.totalUsd)} volume</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 text-sm">
        <div><div className="text-muted-foreground">Fees saved</div><div className="text-xl font-semibold text-emerald-300">{money(Math.max(0, s.saved))}</div></div>
        <div><div className="text-muted-foreground">Days saved</div><div className="text-xl font-semibold text-emerald-300">{s.daysSaved}</div></div>
        <div><div className="text-muted-foreground">Avg. settlement</div><div className="text-xl font-semibold">~10 min</div></div>
        <p className="col-span-3 text-xs text-muted-foreground">Bank baseline: ${BANK_FIXED_FEE_USD} + {(BANK_FX_SPREAD * 100).toFixed(1)}% FX spread, {BANK_DAYS} business days. Settlivo: {(SETTLIVO_FEE * 100).toFixed(1)}%.</p>
      </CardContent>
    </Card>
  );
}
