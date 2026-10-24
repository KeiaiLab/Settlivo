"use server";

import { revalidatePath } from "next/cache";
import { getLinkRequest, getOrg, getWallet, getWorker, listWalletsByOwner, putLinkRequest, putOrg, putWallet, putWorker } from "@/lib/db/repo";
import { newId } from "@/lib/domain/ids";
import type { Wallet } from "@/lib/domain/types";
import { isAddress, markDefault, platformAddress } from "@/lib/domain/wallets";
import { notify } from "@/lib/settlement/notify";
import { requireCompany, requireWorker } from "@/lib/session";

function walletFrom(formData: FormData, owner: Wallet["owner"], token: Wallet["token"], seed: string): Wallet {
  const label = String(formData.get("label") ?? "").trim() || "Wallet";
  const address = String(formData.get("address") ?? "").trim().toLowerCase();
  if (address && !isAddress(address)) throw new Error("Address must be a 0x… 40-hex address");
  return {
    id: newId("wal"),
    owner,
    label,
    address: address || platformAddress(seed),
    token,
    kind: address ? "external" : "platform",
    status: "active",
    isDefault: false,
    createdAt: new Date().toISOString(),
  };
}

/** Spec §5.12: an org adds a wallet (external address, or a new platform wallet when the address is blank). */
export async function addOrgWallet(formData: FormData) {
  const s = await requireCompany();
  const wallet = walletFrom(formData, { type: "org", id: s.orgId }, "USDC", `${s.orgId}:${Date.now()}`);
  await putWallet(wallet);
  revalidatePath("/company/wallets");
}

export async function setOrgDefaultWallet(walletId: string) {
  const s = await requireCompany();
  const [org, wallets] = await Promise.all([getOrg(s.orgId), listWalletsByOwner({ type: "org", id: s.orgId })]);
  const target = wallets.find((w) => w.id === walletId && w.status === "active");
  if (!org || !target) return;
  await Promise.all(markDefault(wallets, walletId).map(putWallet));
  await putOrg({ ...org, defaultWalletId: walletId, walletAddress: target.address });
  revalidatePath("/company/wallets");
  revalidatePath("/company");
}

/** A worker adds a wallet; when it answers a link request the request is closed as accepted. */
export async function addWorkerWallet(formData: FormData) {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) return;
  const wallet = walletFrom(formData, { type: "worker", id: worker.id }, worker.payoutPrefs.stablecoin, `${worker.id}:${Date.now()}`);
  await putWallet(wallet);
  await Promise.all(worker.orgIds.map((orgId) => notify({ type: "org", id: orgId }, "wallet_added", `${worker.name} added a wallet`, `${wallet.label} (${wallet.kind})`, `/company/workers/${worker.id}`)));
  const linkRequestId = String(formData.get("linkRequestId") ?? "");
  if (linkRequestId) await respondLinkRequest(linkRequestId, true, wallet.id);
  revalidatePath("/worker/settings");
}

/** Changing the payout wallet goes through the company approval of §5.3. */
export async function setPayoutWallet(walletId: string) {
  const s = await requireWorker();
  const [worker, wallet] = await Promise.all([getWorker(s.workerId), getWallet(walletId)]);
  if (!worker || !wallet || wallet.owner.type !== "worker" || wallet.owner.id !== worker.id || wallet.status !== "active") return;
  const prefs = { ...worker.payoutPrefs, wallet: wallet.kind, externalAddress: wallet.kind === "external" ? wallet.address : undefined, walletId: wallet.id };
  await putWorker({ ...worker, pendingPayoutPrefs: { ...prefs, submittedAt: new Date().toISOString() } });
  await Promise.all(worker.orgIds.map((orgId) => notify({ type: "org", id: orgId }, "prefs_submitted", `${worker.name} changed payout wallet`, `${wallet.label} (${wallet.kind}). Needs approval.`, "/company/approvals")));
  revalidatePath("/worker/settings");
}

export async function respondLinkRequest(id: string, accept: boolean, walletId?: string) {
  const s = await requireWorker();
  const [worker, lr] = await Promise.all([getWorker(s.workerId), getLinkRequest(id)]);
  if (!worker || !lr || lr.workerId !== worker.id || lr.status !== "pending") return;
  const org = await getOrg(lr.orgId);
  await putLinkRequest({ ...lr, status: accept ? "accepted" : "declined", walletId: accept ? walletId : undefined, resolvedAt: new Date().toISOString() });
  await notify(
    { type: "org", id: lr.orgId },
    accept ? "link_accepted" : "link_declined",
    accept ? `${worker.name} linked a ${lr.kind === "bank" ? "bank account" : "wallet"}` : `${worker.name} declined your ${lr.kind} request`,
    accept ? `Ready for payouts from ${org?.name ?? "your company"}.` : lr.message,
    `/company/workers/${worker.id}`,
  );
  revalidatePath("/worker/settings");
}
