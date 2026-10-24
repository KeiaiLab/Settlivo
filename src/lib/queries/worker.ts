import { getChain } from "@/lib/chain";
import { getOrg, getWorker, listInvoicesByWorker, listWithdrawalsByWorker } from "@/lib/db/repo";
import { currentRates } from "@/lib/actions/invoices";
import { fromUsdc } from "@/lib/fx/convert";
import type { Org } from "@/lib/domain/types";

export async function workerContext(workerId: string) {
  const worker = await getWorker(workerId);
  if (!worker) return null;
  const [invoices, withdrawals, rates, orgs] = await Promise.all([
    listInvoicesByWorker(workerId),
    listWithdrawalsByWorker(workerId),
    currentRates(),
    Promise.all(worker.orgIds.map(getOrg)),
  ]);
  const address = worker.payoutPrefs.wallet === "external" && worker.payoutPrefs.externalAddress ? worker.payoutPrefs.externalAddress : worker.platformWallet;
  const balance = await getChain().getBalance(address, worker.payoutPrefs.stablecoin);
  const localBalance = fromUsdc(balance, worker.localCurrency, rates);
  const orgMap: Record<string, Org> = Object.fromEntries(orgs.filter((o) => o !== null).map((o) => [o.id, o]));
  return { worker, invoices, withdrawals, rates, orgs: Object.values(orgMap), orgMap, address, balance, localBalance };
}
