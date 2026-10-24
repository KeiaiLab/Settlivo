import { getChain } from "@/lib/chain";
import { getOrg, getWorker, listInvoicesByWorker, listLinkRequestsByWorker, listWalletsByOwner, listWithdrawalsByWorker } from "@/lib/db/repo";
import { currentRates } from "@/lib/actions/invoices";
import { memberships } from "@/lib/domain/membership";
import { defaultWallet } from "@/lib/domain/wallets";
import { fromUsdc } from "@/lib/fx/convert";
import type { Org } from "@/lib/domain/types";

export async function workerContext(workerId: string) {
  const worker = await getWorker(workerId);
  if (!worker) return null;
  const allMemberships = memberships(worker);
  const [invoices, withdrawals, rates, orgs, wallets, linkRequests] = await Promise.all([
    listInvoicesByWorker(workerId),
    listWithdrawalsByWorker(workerId),
    currentRates(),
    Promise.all(allMemberships.map((m) => getOrg(m.orgId))),
    listWalletsByOwner({ type: "worker", id: workerId }),
    listLinkRequestsByWorker(workerId),
  ]);
  const payout = defaultWallet(wallets);
  const address = payout?.address ?? (worker.payoutPrefs.wallet === "external" && worker.payoutPrefs.externalAddress ? worker.payoutPrefs.externalAddress : worker.platformWallet);
  const balance = await getChain().getBalance(address, worker.payoutPrefs.stablecoin);
  const localBalance = fromUsdc(balance, worker.localCurrency, rates);
  const orgMap: Record<string, Org> = Object.fromEntries(orgs.filter((o) => o !== null).map((o) => [o.id, o]));
  const activeOrgs = Object.values(orgMap).filter((o) => worker.orgIds.includes(o.id));
  return { worker, invoices, withdrawals, rates, orgs: activeOrgs, orgMap, memberships: allMemberships, wallets, payoutWallet: payout, linkRequests, address, balance, localBalance };
}
