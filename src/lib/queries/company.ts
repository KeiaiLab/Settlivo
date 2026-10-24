import { getOrg, listInvoicesByOrg, listWorkersByOrg } from "@/lib/db/repo";
import type { Worker } from "@/lib/domain/types";

export async function companyContext(orgId: string) {
  const [org, workers, invoices] = await Promise.all([getOrg(orgId), listWorkersByOrg(orgId), listInvoicesByOrg(orgId)]);
  const workerMap: Record<string, Worker> = Object.fromEntries(workers.map((w) => [w.id, w]));
  return { org, workers, invoices, workerMap };
}

export function thisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}
