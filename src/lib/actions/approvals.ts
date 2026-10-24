"use server";

import { revalidatePath } from "next/cache";
import { getOrg, getWorker, listWalletsByOwner, putWallet, putWorker } from "@/lib/db/repo";
import { markDefault } from "@/lib/domain/wallets";
import { notify } from "@/lib/settlement/notify";
import { requireCompany } from "@/lib/session";

export async function approvePayoutPrefs(workerId: string, approved: boolean, reason?: string) {
  const s = await requireCompany();
  const worker = await getWorker(workerId);
  const org = await getOrg(s.orgId);
  if (!worker || !worker.pendingPayoutPrefs || !org) return;
  const { submittedAt: _submittedAt, ...prefs } = worker.pendingPayoutPrefs;
  void _submittedAt;
  await putWorker({
    ...worker,
    payoutPrefs: approved ? prefs : worker.payoutPrefs,
    pendingPayoutPrefs: undefined,
  });
  if (approved && prefs.walletId) {
    const wallets = await listWalletsByOwner({ type: "worker", id: workerId });
    if (wallets.some((w) => w.id === prefs.walletId)) await Promise.all(markDefault(wallets, prefs.walletId).map(putWallet));
  }
  await notify(
    { type: "worker", id: workerId },
    approved ? "prefs_approved" : "prefs_rejected",
    approved ? `${org.name} approved your payout settings` : `${org.name} declined your payout settings`,
    approved ? `Future payouts go to your ${prefs.wallet === "external" ? "external wallet" : "Settlivo wallet"} in ${prefs.stablecoin}.` : `Reason: ${reason ?? "Not specified"}`,
    "/worker/settings",
  );
  revalidatePath("/company/approvals");
}
