import { Check, Circle, Clock, X } from "lucide-react";
import type { Invoice, InvoiceStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS: { key: InvoiceStatus; label: string }[] = [
  { key: "pending_approval", label: "Issued" },
  { key: "scheduled", label: "Approved & scheduled" },
  { key: "sending", label: "Settling on-chain" },
  { key: "confirmed", label: "Confirmed" },
];

export function InvoiceTimeline({ invoice }: { invoice: Invoice }) {
  const reached = new Map(invoice.history.map((h) => [h.status, h]));
  const terminalBad = invoice.status === "rejected" || invoice.status === "failed";
  const order = STEPS.map((s) => s.key);
  const currentIdx = Math.max(0, order.indexOf(invoice.status));
  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const h = reached.get(step.key);
        const done = !!h && (i < currentIdx || invoice.status === "confirmed");
        const active = step.key === invoice.status;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <span className={cn("mt-0.5 grid size-5 place-items-center rounded-full border", done ? "border-emerald-500 bg-emerald-500 text-emerald-950" : active ? "border-sky-400 text-sky-300" : "border-border text-muted-foreground")}>
              {done ? <Check className="size-3" /> : active ? <Clock className="size-3" /> : <Circle className="size-2" />}
            </span>
            <div className="leading-tight">
              <div className={cn("text-sm", done || active ? "text-foreground" : "text-muted-foreground")}>{step.label}</div>
              {h && <div className="text-xs text-muted-foreground">{formatDateTime(h.at)} · {h.by.replace(/^(org|worker|system):/, "")}</div>}
              {step.key === "scheduled" && invoice.blockedReason && <div className="text-xs text-orange-300">Blocked until worker completes KYC</div>}
            </div>
          </li>
        );
      })}
      {terminalBad && (
        <li className="flex items-start gap-3">
          <span className="mt-0.5 grid size-5 place-items-center rounded-full border border-rose-500 bg-rose-500/20 text-rose-300"><X className="size-3" /></span>
          <div className="leading-tight">
            <div className="text-sm">{invoice.status === "rejected" ? "Rejected" : "Failed"}</div>
            <div className="text-xs text-muted-foreground">{invoice.rejectReason ?? invoice.error}</div>
          </div>
        </li>
      )}
    </ol>
  );
}
