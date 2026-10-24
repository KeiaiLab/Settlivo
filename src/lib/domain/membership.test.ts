import { expect, test } from "vitest";
import type { Invoice, Worker } from "./types";
import { completeOffboarding, isActiveMember, joinOrg, leaveOrg, memberships, openInvoices, startOffboarding } from "./membership";

const base: Worker = {
  id: "wrk_t", name: "T", email: "t@x", country: "KR", localCurrency: "KRW", avatarInitials: "T",
  orgIds: ["org_a"], memberships: [], kyc: { status: "verified", steps: { identity: true, address: true, tax: true } },
  platformWallet: "0x0", payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "KRW", cadence: "monthly" }, createdAt: "2026-07-01T00:00:00.000Z",
};

test("legacy orgIds become active memberships", () => {
  expect(memberships(base)).toEqual([{ orgId: "org_a", status: "active", joinedAt: base.createdAt }]);
  expect(isActiveMember(base, "org_a")).toBe(true);
  expect(isActiveMember(base, "org_b")).toBe(false);
});

test("join, offboard with a final invoice, then complete", () => {
  let w = joinOrg(base, "org_b", "2026-10-01T00:00:00.000Z");
  expect(w.orgIds).toEqual(["org_a", "org_b"]);
  w = startOffboarding(w, "org_a", "2026-10-24T00:00:00.000Z", "inv_final");
  expect(w.orgIds).toEqual(["org_a", "org_b"]);
  expect(isActiveMember(w, "org_a")).toBe(true);
  w = completeOffboarding(w, "org_a", "2026-10-24T01:00:00.000Z");
  expect(w.orgIds).toEqual(["org_b"]);
  expect(memberships(w).find((m) => m.orgId === "org_a")).toMatchObject({ status: "offboarded", leftAt: "2026-10-24T01:00:00.000Z", finalInvoiceId: "inv_final" });
});

test("remove ends the membership immediately and open invoices are detected", () => {
  const w = leaveOrg(base, "org_a", "2026-10-24T00:00:00.000Z");
  expect(w.orgIds).toEqual([]);
  expect(isActiveMember(w, "org_a")).toBe(false);
  const inv = { id: "inv_1", orgId: "org_a", workerId: "wrk_t", status: "scheduled" } as Invoice;
  expect(openInvoices([inv, { ...inv, id: "inv_2", status: "confirmed" }], "wrk_t", "org_a").map((i) => i.id)).toEqual(["inv_1"]);
});
