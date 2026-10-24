import { getOrg, listInvoicesByOrg, listLinkRequestsByOrg, listWalletsByOwner, listWorkersByOrg } from "@/lib/db/repo";
import { isActiveMember } from "@/lib/domain/membership";
import type { Worker } from "@/lib/domain/types";

/** `workers` are current members; `formerWorkers` keep their history (§5.11). */
export async function companyContext(orgId: string) {
  const [org, members, invoices, wallets, linkRequests] = await Promise.all([
    getOrg(orgId),
    listWorkersByOrg(orgId),
    listInvoicesByOrg(orgId),
    listWalletsByOwner({ type: "org", id: orgId }),
    listLinkRequestsByOrg(orgId),
  ]);
  const workers = members.filter((w) => isActiveMember(w, orgId));
  const formerWorkers = members.filter((w) => !isActiveMember(w, orgId));
  const workerMap: Record<string, Worker> = Object.fromEntries(members.map((w) => [w.id, w]));
  return { org, workers, formerWorkers, invoices, workerMap, wallets, linkRequests };
}

export function thisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}
