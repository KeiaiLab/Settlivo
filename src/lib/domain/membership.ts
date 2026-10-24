import type { Invoice, Membership, Worker } from "./types";

/** Invoice statuses that still need action in an org; a worker cannot be removed while any exist. */
const OPEN_STATUSES: Invoice["status"][] = ["pending_approval", "scheduled", "sending"];

/** Older records carry only `orgIds`; treat each as an active membership that started when the worker was created. */
export function memberships(w: Worker): Membership[] {
  if (w.memberships && w.memberships.length > 0) return w.memberships;
  return w.orgIds.map((orgId) => ({ orgId, status: "active" as const, joinedAt: w.createdAt }));
}

export function membershipFor(w: Worker, orgId: string): Membership | undefined {
  return memberships(w).find((m) => m.orgId === orgId);
}

/** Active or offboarding members can still be paid; offboarded ones only keep their history. */
export function isActiveMember(w: Worker, orgId: string): boolean {
  const m = membershipFor(w, orgId);
  return !!m && m.status !== "offboarded";
}

function activeOrgIds(list: Membership[]): string[] {
  return list.filter((m) => m.status !== "offboarded").map((m) => m.orgId);
}

export function openInvoices(invoices: Invoice[], workerId: string, orgId: string): Invoice[] {
  return invoices.filter((i) => i.workerId === workerId && i.orgId === orgId && OPEN_STATUSES.includes(i.status));
}

function withMembership(w: Worker, m: Membership): Worker {
  const rest = memberships(w).filter((x) => x.orgId !== m.orgId);
  const next = [...rest, m].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return { ...w, memberships: next, orgIds: activeOrgIds(next) };
}

export function joinOrg(w: Worker, orgId: string, now: string): Worker {
  const existing = membershipFor(w, orgId);
  if (existing && existing.status !== "offboarded") return w;
  return withMembership(w, { orgId, status: "active", joinedAt: now });
}

/** Remove without a final payment: the membership ends now. */
export function leaveOrg(w: Worker, orgId: string, now: string): Worker {
  const m = membershipFor(w, orgId);
  if (!m) return w;
  return withMembership(w, { ...m, status: "offboarded", leftAt: now, finalInvoiceId: undefined });
}

/** Offboard: with a final invoice the membership waits for it to confirm, otherwise it ends immediately. */
export function startOffboarding(w: Worker, orgId: string, now: string, finalInvoiceId?: string): Worker {
  const m = membershipFor(w, orgId);
  if (!m) return w;
  if (!finalInvoiceId) return leaveOrg(w, orgId, now);
  return withMembership(w, { ...m, status: "offboarding", finalInvoiceId });
}

export function completeOffboarding(w: Worker, orgId: string, now: string): Worker {
  const m = membershipFor(w, orgId);
  if (!m || m.status !== "offboarding") return w;
  return withMembership(w, { ...m, status: "offboarded", leftAt: now });
}
