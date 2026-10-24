import { SimulatedChain } from "@/lib/chain/simulated";
import { flushAll, putFxRates, putInvoice, putOrg, putPayrollRun, putTx, putWithdrawal, putWorker, pushFxHistory, pushNotification } from "@/lib/db/repo";
import { FALLBACK_RATES } from "@/lib/fx/fallback";
import { fxHistory, generate } from "./generate";
import { ORGS, WORKERS } from "./personas";

const WORKER_BALANCES: Record<string, string> = {
  wrk_alice: "2400.000000",
  wrk_bob: "1320.500000",
  wrk_carlos: "860.000000",
  wrk_dana: "1975.250000",
  wrk_eun: "0.000000",
};

export async function seedAll({ flush }: { flush: boolean }): Promise<{ counts: Record<string, number> }> {
  if (flush) await flushAll();
  const g = generate();
  const chain = new SimulatedChain();

  for (const org of ORGS) {
    await putOrg(org);
    await chain.setBalance(org.walletAddress, "USDC", org.usdcBalance);
  }
  for (const w of WORKERS) {
    await putWorker(w);
    const addr = w.payoutPrefs.wallet === "external" && w.payoutPrefs.externalAddress ? w.payoutPrefs.externalAddress : w.platformWallet;
    await chain.setBalance(addr, w.payoutPrefs.stablecoin, WORKER_BALANCES[w.id] ?? "0.000000");
  }
  for (const inv of g.invoices) await putInvoice(inv);
  for (const tx of g.txs) await putTx(tx);
  for (const run of g.payrollRuns) await putPayrollRun(run);
  for (const wd of g.withdrawals) await putWithdrawal(wd);
  for (const n of g.notifications.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) await pushNotification(n);
  const history = fxHistory(30);
  for (const p of history) await pushFxHistory(p);
  await putFxRates({ base: "USD", rates: history.at(-1)!.rates ?? FALLBACK_RATES, fetchedAt: new Date().toISOString(), source: "fallback" });

  return {
    counts: {
      orgs: ORGS.length,
      workers: WORKERS.length,
      invoices: g.invoices.length,
      txs: g.txs.length,
      payrollRuns: g.payrollRuns.length,
      withdrawals: g.withdrawals.length,
      notifications: g.notifications.length,
      fxHistory: history.length,
    },
  };
}
