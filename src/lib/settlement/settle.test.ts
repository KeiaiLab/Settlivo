import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Invoice, Notification, Tx, Wallet, Worker } from "@/lib/domain/types";

const db = { invoices: new Map<string, Invoice>(), workers: new Map<string, Worker>(), notifications: [] as Notification[], wallets: [] as Wallet[] , org: { id: "org_acme", name: "Acme Remote" } as { id: string; name: string; plan?: { tier: "free" | "pro" | "business"; renewsAt: string; sendsThisMonth: number } } };
vi.mock("@/lib/db/repo", () => ({
  getInvoice: async (id: string) => db.invoices.get(id) ?? null,
  putInvoice: async (inv: Invoice) => { db.invoices.set(inv.id, inv); },
  getWorker: async (id: string) => db.workers.get(id) ?? null,
  putWorker: async (w: Worker) => { db.workers.set(w.id, w); },
  listWalletsByOwner: async () => db.wallets,
  getOrg: async () => db.org,
  putOrg: async (o: unknown) => { db.org = o as typeof db.org; },
  pushNotification: async (n: Notification) => { db.notifications.push(n); },
  putFxRates: async () => {},
  pushFxHistory: async () => {},
}));

const chain = {
  transfer: vi.fn(),
  waitForConfirmation: vi.fn(),
  getBalance: vi.fn(),
  explorerUrl: (h: string) => `/explorer/tx/${h}`,
};
vi.mock("@/lib/chain", () => ({ getChain: () => chain, chainMode: () => "simulated" }));

vi.mock("@/lib/fx/rates", () => ({
  getRates: async () => ({ base: "USD", rates: { USD: 1, KRW: 1380, PHP: 58, BRL: 5, PLN: 4, VND: 25000, EUR: 0.9 }, fetchedAt: "", source: "fallback" }),
}));

const resumeHook = vi.fn();
const start = vi.fn(async () => ({ runId: "run_1" }));
vi.mock("workflow/api", () => ({ resumeHook: (token: string, data: unknown) => resumeHook(token, data), start: () => start() }));
vi.mock("@/workflows/invoice", () => ({ invoiceWorkflow: () => {} }));

import { settleInvoice } from "./settle";
import { approveInvoice } from "@/lib/scheduler";

function worker(over: Partial<Worker> = {}): Worker {
  return {
    id: "wrk_1", name: "Alice", email: "a@x", country: "KR", localCurrency: "KRW", avatarInitials: "AL", orgIds: ["org_acme"],
    kyc: { status: "verified", steps: { identity: true, address: true, tax: true } },
    platformWallet: "0xPLATFORM",
    payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "KRW", cadence: "monthly" },
    createdAt: "", ...over,
  };
}
function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_1", orgId: "org_acme", workerId: "wrk_1", initiatedBy: "company", amount: 3_000_000, currency: "KRW", stablecoin: "USDC",
    memo: "Oct", scheduledAt: "2026-10-24T05:00:00.000Z", status: "scheduled", quoteRate: 1385, invoiceHash: "ab".repeat(32),
    history: [], createdAt: "", ...over,
  };
}

beforeEach(() => {
  db.invoices.clear(); db.workers.clear(); db.notifications.length = 0; db.wallets = []; db.org = { id: "org_acme", name: "Acme Remote" };
  vi.clearAllMocks();
  process.env.SCHEDULER = "workflow";
  const tx: Tx = { id: "tx_1", hash: "0xabc", from: "0xP", to: "0xPLATFORM", token: "USDC", amount: "1", status: "pending", calldata: "0x", memo: { invoiceId: "inv_1", invoiceHash: "" }, explorerUrl: "", createdAt: "" };
  chain.transfer.mockResolvedValue(tx);
  chain.waitForConfirmation.mockResolvedValue({ ...tx, status: "confirmed", blockNumber: 1 });
});

describe("settleInvoice", () => {
  test("blocks when the sender's Free plan has no sends left, and counts a send on confirm", async () => {
    db.org = { id: "org_acme", name: "Acme Remote", plan: { tier: "free", renewsAt: "2099-01-01T00:00:00.000Z", sendsThisMonth: 3 } };
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice());
    const blocked = await settleInvoice("inv_1");
    expect(blocked.status).toBe("scheduled");
    expect(blocked.blockedReason).toBe("plan");
    expect(chain.transfer).not.toHaveBeenCalled();
    db.org = { id: "org_acme", name: "Acme Remote", plan: { tier: "business", renewsAt: "2099-01-01T00:00:00.000Z", sendsThisMonth: 0 } };
    db.invoices.set("inv_1", { ...invoice(), blockedReason: undefined });
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("confirmed");
    expect(inv.feeUsdc).toBe("0.000000");
    expect(db.org.plan?.sendsThisMonth).toBe(1);
  });

  test("blocks on unverified KYC without transferring", async () => {
    db.workers.set("wrk_1", worker({ kyc: { status: "pending", steps: { identity: false, address: false, tax: false } } }));
    db.invoices.set("inv_1", invoice());
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("scheduled");
    expect(inv.blockedReason).toBe("kyc");
    expect(chain.transfer).not.toHaveBeenCalled();
  });

  test("pays the default wallet entity and snapshots its id", async () => {
    db.wallets = [
      { id: "wal_a", owner: { type: "worker", id: "wrk_1" }, label: "Settlivo wallet", address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", token: "USDC", kind: "platform", status: "active", isDefault: false, createdAt: "2026-07-01T00:00:00.000Z" },
      { id: "wal_b", owner: { type: "worker", id: "wrk_1" }, label: "Cold", address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", token: "USDC", kind: "external", status: "active", isDefault: true, createdAt: "2026-08-01T00:00:00.000Z" },
    ];
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice());
    const inv = await settleInvoice("inv_1");
    expect(chain.transfer).toHaveBeenCalledWith(expect.objectContaining({ to: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }));
    expect(inv.payoutWalletId).toBe("wal_b");
  });

  test("pays the wallet and token active at send time", async () => {
    db.workers.set("wrk_1", worker({ payoutPrefs: { wallet: "external", externalAddress: "0xEXT", stablecoin: "USDT", displayCurrency: "KRW", cadence: "monthly" } }));
    db.invoices.set("inv_1", invoice());
    await settleInvoice("inv_1");
    expect(chain.transfer).toHaveBeenCalledWith(expect.objectContaining({ to: "0xEXT", token: "USDT" }));
  });

  test("records executedRate and usdcAmount and confirms", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice());
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("confirmed");
    expect(inv.usdcAmount).toBe("2173.913043");
    expect(inv.executedRate).toBe(1380);
    expect(inv.txId).toBe("tx_1");
    // Spread: applied = market, 0.5% fee on top for the company.
    expect(inv.appliedRate).toBe(1380);
    expect(inv.feeUsdc).toBe("10.869565");
    expect(inv.lockExpired).toBeUndefined();
  });

  test("fixed-rate invoice settles at the locked rate while the lock holds", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice({ rateMode: "fixed", feeBps: 110, lockedRate: 1385, lockExpiresAt: "2999-01-01T00:00:00.000Z" }));
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("confirmed");
    expect(chain.transfer).toHaveBeenCalledWith(expect.objectContaining({ amount: "2166.064981" }));
    expect(inv).toMatchObject({ usdcAmount: "2166.064981", appliedRate: 1385, executedRate: 1380, feeUsdc: "23.826714" });
    expect(inv.lockExpired).toBeUndefined();
    expect(db.notifications.map((n) => n.kind)).not.toContain("invoice_rate_lock_expired");
  });

  test("expired lock falls back to the market rate and tells the company", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice({ rateMode: "fixed", feeBps: 110, lockedRate: 1385, lockExpiresAt: "2020-01-01T00:00:00.000Z" }));
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("confirmed");
    expect(chain.transfer).toHaveBeenCalledWith(expect.objectContaining({ amount: "2173.913043" }));
    expect(inv).toMatchObject({ usdcAmount: "2173.913043", appliedRate: 1380, executedRate: 1380, feeUsdc: "23.913043", lockExpired: true });
    const n = db.notifications.find((x) => x.kind === "invoice_rate_lock_expired");
    expect(n).toMatchObject({ recipient: { type: "org", id: "org_acme" }, title: "Rate lock expired, settled at market", href: "/company/invoices/inv_1" });
    expect(n?.body).toContain("₩3,000,000");
    expect(db.notifications.filter((x) => x.kind === "invoice_settled")).toHaveLength(2);
  });

  test("marks failed on chain error", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice());
    chain.transfer.mockRejectedValue(new Error("RPC timeout"));
    const inv = await settleInvoice("inv_1");
    expect(inv.status).toBe("failed");
    expect(inv.error).toMatch(/rpc/i);
  });
});

describe("approveInvoice", () => {
  test("is idempotent when already scheduled", async () => {
    db.invoices.set("inv_1", invoice({ status: "scheduled" }));
    const inv = await approveInvoice("inv_1", "worker:wrk_1", true);
    expect(inv.status).toBe("scheduled");
    expect(resumeHook).not.toHaveBeenCalled();
  });

  test("moves pending_approval to scheduled and resumes the hook", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice({ status: "pending_approval" }));
    const inv = await approveInvoice("inv_1", "worker:wrk_1", true);
    expect(inv.status).toBe("scheduled");
    expect(resumeHook).toHaveBeenCalledWith("approve:inv_1", { approved: true });
  });

  test("rejects with reason", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice({ status: "pending_approval" }));
    const inv = await approveInvoice("inv_1", "worker:wrk_1", false, "Wrong amount");
    expect(inv.status).toBe("rejected");
    expect(inv.rejectReason).toBe("Wrong amount");
  });
});

describe("approveInvoice when the workflow hook is not registered yet", () => {
  test("falls back to starting a new run that takes the scheduled branch", async () => {
    db.workers.set("wrk_1", worker());
    db.invoices.set("inv_1", invoice({ status: "pending_approval" }));
    resumeHook.mockRejectedValue(Object.assign(new Error("no hook"), { name: "HookNotFoundError" }));
    const inv = await approveInvoice("inv_1", "worker:wrk_1", true);
    expect(inv.status).toBe("scheduled");
    expect(start).toHaveBeenCalledTimes(1);
  });
});
