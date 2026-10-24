"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money, Usdc } from "@/components/ui/money";
import type { Currency, Stablecoin } from "@/lib/domain/types";
import { formatRate } from "@/lib/format";
import { estimateUsdc, feeBpsFor, parseRateMode, type RateMode } from "@/lib/fx/pricing";

const subscribeNoop = () => () => {};
const SELECT_CLASS = "h-9 rounded-md border border-input bg-background px-3 text-sm";

/**
 * Amount + currency inputs, the FX pricing mode (spread vs fixed) and a live, thousands-separated
 * preview of the stablecoin equivalent and the settlement fee. Field ids/names stay
 * `amount` / `currency` / `rateMode` for the server actions.
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
  const [mode, setMode] = useState<RateMode>("spread");
  // Intl output is formatted only in the browser so server and client never disagree during hydration.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const n = Number(amount);
  const rate = rates[currency];
  const valid = Number.isFinite(n) && n > 0 && !!rate;
  const estimate = valid ? estimateUsdc(n, currency, rate, mode) : null;
  const feePct = `${feeBpsFor(mode) / 100}%`;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">{label}</Label>
          <Input id="amount" name="amount" type="number" min="1" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" aria-describedby="amount-preview" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="currency">Currency</Label>
          <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={SELECT_CLASS}>
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rateMode">Rate</Label>
        <select id="rateMode" name="rateMode" value={mode} onChange={(e) => setMode(parseRateMode(e.target.value))} className={SELECT_CLASS} aria-describedby="amount-preview">
          <option value="spread">Spread · market rate at send · 0.5% fee</option>
          <option value="fixed">Fixed · lock today&apos;s rate for 24 h · 1.1% fee</option>
        </select>
        <p id="amount-preview" className="flex min-h-5 flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground" aria-live="polite">
          {mounted && estimate ? (
            <>
              <Money amount={n} currency={currency} className="text-sm text-foreground" />
              <span>{mode === "fixed" ? "=" : "≈"}</span>
              <Usdc value={estimate.usdc} token={stablecoin} className="text-sm text-foreground" />
              {mode === "fixed" ? (
                <span>locked at {formatRate(rate, currency)} for 24 h</span>
              ) : (
                <span>at today&apos;s indicative {formatRate(rate, currency)}; final rate locked at send</span>
              )}
              <span>· fee <Usdc value={estimate.fee} token={stablecoin} /> ({feePct})</span>
            </>
          ) : (
            <span>{mounted ? "Enter an amount to see the stablecoin equivalent." : ""}</span>
          )}
        </p>
      </div>
    </div>
  );
}
