import type { ReactNode } from "react";

/**
 * A ledger figure: the number leads, the label sits under it, no icon. `icon` stays in the signature for
 * call-site compatibility but is not drawn — the figure is the whole point.
 */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-surface px-5 py-5">
      <div className="text-[1.6rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-3 text-sm">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
