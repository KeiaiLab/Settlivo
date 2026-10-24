import type { PayoutPrefs } from "@/lib/domain/types";

const ROWS: { key: keyof PayoutPrefs; label: string; fmt?: (p: PayoutPrefs) => string }[] = [
  { key: "wallet", label: "Wallet", fmt: (p) => (p.wallet === "external" ? `External ${p.externalAddress?.slice(0, 8)}…` : "Settlivo wallet") },
  { key: "stablecoin", label: "Stablecoin" },
  { key: "displayCurrency", label: "Display currency" },
  { key: "cadence", label: "Cadence", fmt: (p) => ({ monthly: "Monthly", biweekly: "Bi-weekly", per_invoice: "Per invoice" })[p.cadence] },
  { key: "bankAccount", label: "Bank account", fmt: (p) => (p.bankAccount ? `${p.bankAccount.bankName} ${p.bankAccount.accountMasked}` : "—") },
];

export function PrefsDiff({ current, proposed }: { current: PayoutPrefs; proposed: PayoutPrefs }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {ROWS.map((r) => {
          const a = r.fmt ? r.fmt(current) : String(current[r.key] ?? "—");
          const b = r.fmt ? r.fmt(proposed) : String(proposed[r.key] ?? "—");
          const changed = a !== b;
          return (
            <tr key={r.key} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pr-3 text-muted-foreground">{r.label}</td>
              <td className={`py-1.5 pr-3 ${changed ? "line-through text-muted-foreground" : ""}`}>{a}</td>
              <td className={`py-1.5 ${changed ? "font-medium text-emerald-300" : "text-muted-foreground"}`}>{b}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
