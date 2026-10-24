"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Currency } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const BANK_FEE_USD = 35;
const BANK_SPREAD = 0.022;

export function WithdrawForm({ action, balance, currency, rate, fee, bank, stablecoin }: { action: (fd: FormData) => Promise<void>; balance: string; currency: Currency; rate: number; fee: number; bank?: string; stablecoin: string }) {
  const [amount, setAmount] = useState(Math.min(500, Math.floor(Number(balance))));
  const net = amount * (1 - fee);
  const local = net * rate;
  const bankLocal = (amount - BANK_FEE_USD) * rate * (1 - BANK_SPREAD);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="usdcAmount">Amount ({stablecoin})</Label>
        <Input id="usdcAmount" name="usdcAmount" type="number" min="1" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <p className="text-xs text-muted-foreground">Available: {Number(balance).toLocaleString("en-US", { maximumFractionDigits: 2 })} {stablecoin}</p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground"><th className="p-2 text-left font-normal" /><th className="p-2 text-left font-normal">Settlivo</th><th className="p-2 text-left font-normal">Bank wire</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="p-2 text-muted-foreground">Fee</td><td className="p-2">{(fee * 100).toFixed(1)}% ({(amount * fee).toFixed(2)} {stablecoin})</td><td className="p-2 text-muted-foreground">${BANK_FEE_USD} + {(BANK_SPREAD * 100).toFixed(1)}% spread</td></tr>
            <tr className="border-t"><td className="p-2 text-muted-foreground">Rate</td><td className="p-2">{rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} {currency}/USD</td><td className="p-2 text-muted-foreground">bank rate, 2–3% worse</td></tr>
            <tr className="border-t"><td className="p-2 text-muted-foreground">Arrives</td><td className="p-2 text-emerald-300">~10 minutes</td><td className="p-2 text-muted-foreground">3–5 business days</td></tr>
            <tr className="border-t font-medium"><td className="p-2 text-muted-foreground">You receive</td><td className="p-2 text-emerald-300">{formatMoney(local, currency)}</td><td className="p-2 text-muted-foreground">{formatMoney(Math.max(0, bankLocal), currency)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">To {bank ?? "— add a bank account in Settings"}</span>
        <Button type="submit" disabled={!bank || amount <= 0 || amount > Number(balance)}>Withdraw to {currency}</Button>
      </div>
    </form>
  );
}
