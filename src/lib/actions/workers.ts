"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invoiceHash } from "@/lib/chain/memo";
import { getOrg, getWorker, listAllWorkers, listInvoicesByOrg, putInvoice, putLinkRequest, putWallet, putWorker } from "@/lib/db/repo";
import { newId } from "@/lib/domain/ids";
import { isActiveMember, joinOrg, leaveOrg, openInvoices, startOffboarding } from "@/lib/domain/membership";
import { SUPPORTED_CURRENCIES, type Currency, type Invoice, type Stablecoin, type Wallet, type Worker } from "@/lib/domain/types";
import { platformAddress } from "@/lib/domain/wallets";
import { formatMoney } from "@/lib/format";
import { scheduleInvoice } from "@/lib/scheduler";
import { notify } from "@/lib/settlement/notify";
import { requireCompany } from "@/lib/session";
import { currentRates } from "./invoices";

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "W";

/** Spec §5.11 Register: a new worker joins this org; an existing worker (same email) is added as a second membership. */
export async function registerWorker(formData: FormData) {
  const s = await requireCompany();
  const org = await getOrg(s.orgId);
  if (!org) throw new Error("Organization not found");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@settlivo.demo`;
  const country = String(formData.get("country") ?? "").trim().toUpperCase().slice(0, 2) || "US";
  const localCurrency = String(formData.get("localCurrency")) as Currency;
  if (!SUPPORTED_CURRENCIES.includes(localCurrency)) throw new Error("Unsupported currency");
  const stablecoin: Stablecoin = formData.get("stablecoin") === "USDT" ? "USDT" : "USDC";
  const now = new Date().toISOString();

  const existing = (await listAllWorkers()).find((w) => w.email === email);
  if (existing) {
    if (isActiveMember(existing, s.orgId)) redirect(`/company/workers/${existing.id}`);
    await putWorker(joinOrg(existing, s.orgId, now));
    await notify({ type: "worker", id: existing.id }, "worker_invited", `${org.name} added you to their team`, "Invoices from this company will show up on your home.", "/worker");
    revalidatePath("/company/workers");
    redirect(`/company/workers/${existing.id}`);
  }

  const id = newId("wrk");
  const wallet: Wallet = { id: newId("wal"), owner: { type: "worker", id }, label: "Settlivo wallet", address: platformAddress(id), token: stablecoin, kind: "platform", status: "active", isDefault: true, createdAt: now };
  const worker: Worker = {
    id,
    name,
    email,
    country,
    localCurrency,
    avatarInitials: initials(name),
    orgIds: [s.orgId],
    memberships: [{ orgId: s.orgId, status: "active", joinedAt: now }],
    kyc: { status: "pending", steps: { identity: false, address: false, tax: false } },
    platformWallet: wallet.address,
    payoutPrefs: { wallet: "platform", walletId: wallet.id, stablecoin, displayCurrency: localCurrency, cadence: "monthly" },
    createdAt: now,
  };
  await putWorker(worker);
  await putWallet(wallet);
  await notify({ type: "worker", id }, "worker_invited", `${org.name} invited you to Settlivo`, "Finish verification to receive payouts.", "/worker/onboarding");
  revalidatePath("/company/workers");
  redirect(`/company/workers/${id}`);
}

/** Spec §5.11 Remove: ends the membership now; refused while invoices are still open in this org. */
export async function removeWorker(workerId: string) {
  const s = await requireCompany();
  const [worker, org, invoices] = await Promise.all([getWorker(workerId), getOrg(s.orgId), listInvoicesByOrg(s.orgId)]);
  if (!worker || !org || !isActiveMember(worker, s.orgId)) return;
  const open = openInvoices(invoices, workerId, s.orgId);
  if (open.length > 0) throw new Error(`Settle or reject ${open.length} open invoice${open.length === 1 ? "" : "s"} first`);
  await putWorker(leaveOrg(worker, s.orgId, new Date().toISOString()));
  await notify({ type: "worker", id: workerId }, "worker_offboarded", `${org.name} removed you from their team`, "Your payout history and wallets stay available.", "/worker");
  revalidatePath("/company/workers");
  redirect("/company/workers");
}

/** Spec §5.11 Offboard: optional final invoice (pre-approved, settles now), then the membership closes when it confirms. */
export async function offboardWorker(formData: FormData) {
  const s = await requireCompany();
  const workerId = String(formData.get("workerId"));
  const [worker, org] = await Promise.all([getWorker(workerId), getOrg(s.orgId)]);
  if (!worker || !org || !isActiveMember(worker, s.orgId)) return;
  const amount = Number(formData.get("finalAmount") ?? 0);
  const now = new Date().toISOString();
  let final: Invoice | undefined;
  if (Number.isFinite(amount) && amount > 0) {
    const rates = await currentRates();
    const base = { id: newId("inv"), orgId: s.orgId, workerId, amount, currency: worker.localCurrency, scheduledAt: now, memo: "Final settlement" };
    final = {
      ...base,
      initiatedBy: "company",
      stablecoin: worker.payoutPrefs.stablecoin,
      status: "scheduled",
      quoteRate: rates.rates[worker.localCurrency],
      invoiceHash: invoiceHash(base),
      history: [{ status: "scheduled", at: now, by: `org:${s.orgId}`, note: "Offboarding" }],
      createdAt: now,
    };
    await putInvoice(final);
  }
  await putWorker(startOffboarding(worker, s.orgId, now, final?.id));
  if (final) await scheduleInvoice(final.id);
  await notify(
    { type: "worker", id: workerId },
    "worker_offboarded",
    `${org.name} is offboarding you`,
    final ? `Final settlement of ${formatMoney(final.amount, final.currency)} is on its way.` : "No final payment. Your history and wallets stay available.",
    final ? `/worker/invoices/${final.id}` : "/worker",
  );
  revalidatePath("/company/workers");
  revalidatePath(`/company/workers/${workerId}`);
  redirect(`/company/workers/${workerId}`);
}

/** Spec §5.12 Link request: ask a worker to link a wallet or bank account. */
export async function requestLink(formData: FormData) {
  const s = await requireCompany();
  const workerId = String(formData.get("workerId"));
  const kind = formData.get("kind") === "bank" ? "bank" : "wallet";
  const message = String(formData.get("message") ?? "").trim() || (kind === "bank" ? "Please add a bank account for local payouts." : "Please link a wallet for your payouts.");
  const [worker, org] = await Promise.all([getWorker(workerId), getOrg(s.orgId)]);
  if (!worker || !org || !isActiveMember(worker, s.orgId)) return;
  await putLinkRequest({ id: newId("lrq"), orgId: s.orgId, workerId, kind, message, status: "pending", createdAt: new Date().toISOString() });
  await notify({ type: "worker", id: workerId }, "link_requested", `${org.name} asked you to link a ${kind === "bank" ? "bank account" : "wallet"}`, message, "/worker/settings");
  revalidatePath(`/company/workers/${workerId}`);
}
