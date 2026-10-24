import type { Currency } from "@/lib/domain/types";
import { moneyParts, usdcParts } from "@/lib/format";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "hero";

/** Digits and the currency marker are separate spans so the marker can sit flush-left while digits stay flush-right. */
const DIGITS: Record<Size, string> = {
  sm: "text-xs",
  md: "",
  lg: "text-2xl font-semibold tracking-tight",
  hero: "text-4xl font-semibold tracking-tight sm:text-5xl",
};
const UNIT: Record<Size, string> = {
  sm: "text-[0.85em]",
  md: "text-[0.85em]",
  lg: "text-sm font-medium",
  hero: "text-2xl font-medium sm:text-3xl",
};
const GAP: Record<Size, string> = {
  sm: "gap-[0.2em]",
  md: "gap-[0.2em]",
  lg: "gap-[0.3em]",
  hero: "gap-[0.3em]",
};

function Figure({ unit, digits, unitFirst, size, justify, title, className }: { unit: string; digits: string; unitFirst: boolean; size: Size; justify: boolean; title: string; className?: string }) {
  const unitEl = <span className={cn("text-muted-foreground", UNIT[size])}>{unit}</span>;
  const digitsEl = <span className={DIGITS[size]}>{digits}</span>;
  return (
    <span
      className={cn("items-baseline tabular-nums", justify ? "flex w-full justify-between gap-3" : cn("inline-flex", GAP[size]), className)}
      title={title}
    >
      {unitFirst || justify ? unitEl : digitsEl}
      {unitFirst || justify ? digitsEl : unitEl}
    </span>
  );
}

/**
 * Local-currency amount: `₩ 4,200,000`. With `justify` the marker is flush-left and the digits flush-right
 * (accounting style) — use it inside table cells so every row's digits line up.
 */
export function Money({ amount, currency, size = "md", justify = false, dp, className }: { amount: number; currency: Currency; size?: Size; justify?: boolean; dp?: number; className?: string }) {
  const { unit, digits, code } = moneyParts(amount, currency, { dp });
  return <Figure unit={unit} digits={digits} unitFirst size={size} justify={justify} title={`${digits} ${code}`} className={className} />;
}

/** Stablecoin amount: `3,043.48 USDC` inline, `USDC … 3,043.48` when justified. `exact` keeps all 6 dp (on-chain record). */
export function Usdc({ value, token = "USDC", size = "md", justify = false, exact = false, className }: { value: string | number; token?: string; size?: Size; justify?: boolean; exact?: boolean; className?: string }) {
  const { digits, unit } = usdcParts(value, token, { exact });
  const full = usdcParts(value, token, { exact: true });
  return <Figure unit={unit} digits={digits} unitFirst={false} size={size} justify={justify} title={`${full.digits} ${unit}`} className={className} />;
}
