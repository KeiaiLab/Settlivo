import type { Invoice, InvoiceStatus } from "./types";

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["pending_approval", "scheduled"],
  pending_approval: ["scheduled", "rejected"],
  scheduled: ["sending"],
  sending: ["confirmed", "failed"],
  confirmed: [],
  rejected: [],
  failed: ["scheduled"],
};

export class InvalidTransitionError extends Error {
  constructor(from: InvoiceStatus, to: InvoiceStatus) {
    super(`Invalid invoice transition ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Badge key for an invoice: a KYC- or plan-blocked `scheduled` invoice reads as blocked. */
export function badgeStatus(inv: Pick<Invoice, "status" | "blockedReason">): InvoiceStatus | "blocked" | "blocked_plan" {
  if (inv.blockedReason === "plan") return "blocked_plan";
  if (inv.blockedReason) return "blocked";
  return inv.status;
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(
  inv: Invoice,
  to: InvoiceStatus,
  by: string,
  extra: Partial<Invoice> = {},
): Invoice {
  if (!canTransition(inv.status, to)) throw new InvalidTransitionError(inv.status, to);
  const at = new Date().toISOString();
  return {
    ...inv,
    ...extra,
    status: to,
    history: [...inv.history, { status: to, at, by, note: extra.error ?? extra.rejectReason }],
  };
}
