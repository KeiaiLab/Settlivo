import type { Currency } from "@/lib/domain/types";
import { formatMoney, formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({ amount, currency, className }: { amount: number; currency: Currency; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount, currency)}</span>;
}

export function Usdc({ value, token = "USDC", className }: { value: string | number; token?: string; className?: string }) {
  return <span className={cn("tabular-nums font-mono", className)}>{formatUsdc(value, token)}</span>;
}
