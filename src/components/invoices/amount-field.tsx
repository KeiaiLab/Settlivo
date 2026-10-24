"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money, Usdc } from "@/components/ui/money";
import type { Currency, Stablecoin } from "@/lib/domain/types";
import { formatRate } from "@/lib/format";

const subscribeNoop = () => () => {};

/**
 * Amount + currency inputs with a live, thousands-separated preview and the indicative
 * stablecoin equivalent. Field ids/names stay `amount` / `currency` for the server actions.
 */
export function AmountField({ label, currencies, defaultAmount, defaultCurrency, rates, stablecoin }: {
  label: string;
  currencies: readonly Currency[];
  defaultAmount: number;
  defaultCurrency: Currency;
  rates: Record<Currency, number>;
  stablecoin: Stablecoin;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  // Intl output is formatted only in the browser so server and client never disagree during hydration.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const n = Number(amount);
  const rate = rates[currency];
  const valid = Number.isFinite(n) && n > 0 && !!rate;
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">{label}</Label>
          <Input id="amount" name="amount" type="number" min="1" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="currency">Currency</Label>
          <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <p className="flex min-h-5 flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground" aria-live="polite">
        {mounted && valid ? (
          <>
            <Money amount={n} currency={currency} className="text-sm text-foreground" />
            <span>≈</span>
            <Usdc value={n / rate} token={stablecoin} className="text-sm text-foreground" />
            <span>at {formatRate(rate, currency)}, fixed at send time</span>
          </>
        ) : (
          <span>{mounted ? "Enter an amount to see the stablecoin equivalent." : ""}</span>
        )}
      </p>
    </div>
  );
}
