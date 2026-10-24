import { getRedis } from "./redis";
import { memberships } from "@/lib/domain/membership";
import type {
  FxHistoryPoint,
  FxRates,
  Invoice,
  LinkRequest,
  Notification,
  Org,
  PayrollRun,
  Recipient,
  Tx,
  Wallet,
  Withdrawal,
  Worker,
} from "@/lib/domain/types";

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

async function getMany<T>(keys: string[]): Promise<T[]> {
  if (keys.length === 0) return [];
  const rows = await getRedis().mget<(T | null)[]>(...keys);
  return rows.filter((r): r is T => r !== null);
}

// ---- Orgs
export const getOrg = (id: string) => getRedis().get<Org>(`org:${id}`);
export async function putOrg(org: Org) {
  await Promise.all([getRedis().set(`org:${org.id}`, org), getRedis().sadd("orgs", org.id)]);
}

// ---- Workers
export const getWorker = (id: string) => getRedis().get<Worker>(`worker:${id}`);
export async function listAllWorkers(): Promise<Worker[]> {
  const ids = await getRedis().smembers("workers");
  return getMany<Worker>(ids.map((i) => `worker:${i}`));
}
export async function listWorkersByOrg(orgId: string): Promise<Worker[]> {
  const ids = await getRedis().smembers(`org:${orgId}:workers`);
  return (await getMany<Worker>(ids.map((i) => `worker:${i}`))).sort((a, b) => a.name.localeCompare(b.name));
}
/** Former members stay in `org:{id}:workers` so their history remains visible (§5.11). */
export async function putWorker(w: Worker) {
  const r = getRedis();
  await Promise.all([
    r.set(`worker:${w.id}`, w),
    r.sadd("workers", w.id),
    ...memberships(w).map((m) => r.sadd(`org:${m.orgId}:workers`, w.id)),
  ]);
}

// ---- Wallets (§5.12)
const walletSetKey = (owner: Recipient) => `${owner.type}:${owner.id}:wallets`;
export const getWallet = (id: string) => getRedis().get<Wallet>(`wallet:${id}`);
export async function listWalletsByOwner(owner: Recipient): Promise<Wallet[]> {
  const ids = await getRedis().smembers(walletSetKey(owner));
  return (await getMany<Wallet>(ids.map((i) => `wallet:${i}`))).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function putWallet(w: Wallet) {
  await Promise.all([getRedis().set(`wallet:${w.id}`, w), getRedis().sadd(walletSetKey(w.owner), w.id)]);
}

// ---- Link requests (§5.12)
export const getLinkRequest = (id: string) => getRedis().get<LinkRequest>(`linkrequest:${id}`);
async function linkRequestsFromSet(key: string): Promise<LinkRequest[]> {
  const ids = await getRedis().smembers(key);
  return (await getMany<LinkRequest>(ids.map((i) => `linkrequest:${i}`))).sort(byCreatedDesc);
}
export const listLinkRequestsByOrg = (orgId: string) => linkRequestsFromSet(`org:${orgId}:linkrequests`);
export const listLinkRequestsByWorker = (workerId: string) => linkRequestsFromSet(`worker:${workerId}:linkrequests`);
export async function putLinkRequest(lr: LinkRequest) {
  const r = getRedis();
  await Promise.all([
    r.set(`linkrequest:${lr.id}`, lr),
    r.sadd(`org:${lr.orgId}:linkrequests`, lr.id),
    r.sadd(`worker:${lr.workerId}:linkrequests`, lr.id),
  ]);
}

// ---- Invoices
export const getInvoice = (id: string) => getRedis().get<Invoice>(`invoice:${id}`);
async function invoicesFromSet(key: string): Promise<Invoice[]> {
  const ids = await getRedis().smembers(key);
  return (await getMany<Invoice>(ids.map((i) => `invoice:${i}`))).sort(byCreatedDesc);
}
export const listInvoicesByOrg = (orgId: string) => invoicesFromSet(`org:${orgId}:invoices`);
export const listInvoicesByWorker = (workerId: string) => invoicesFromSet(`worker:${workerId}:invoices`);
export const listAllInvoices = () => invoicesFromSet("invoices");
export async function putInvoice(inv: Invoice) {
  const r = getRedis();
  await Promise.all([
    r.set(`invoice:${inv.id}`, inv),
    r.sadd("invoices", inv.id),
    r.sadd(`org:${inv.orgId}:invoices`, inv.id),
    r.sadd(`worker:${inv.workerId}:invoices`, inv.id),
  ]);
}

// ---- Payroll runs
export const getPayrollRun = (id: string) => getRedis().get<PayrollRun>(`payrollrun:${id}`);
export async function listPayrollRunsByOrg(orgId: string): Promise<PayrollRun[]> {
  const ids = await getRedis().smembers(`org:${orgId}:payrollruns`);
  return (await getMany<PayrollRun>(ids.map((i) => `payrollrun:${i}`))).sort(byCreatedDesc);
}
export async function putPayrollRun(run: PayrollRun) {
  await Promise.all([
    getRedis().set(`payrollrun:${run.id}`, run),
    getRedis().sadd(`org:${run.orgId}:payrollruns`, run.id),
  ]);
}

// ---- Transactions
export const getTx = (id: string) => getRedis().get<Tx>(`tx:${id}`);
export async function getTxByHash(hash: string): Promise<Tx | null> {
  const id = await getRedis().get<string>(`txhash:${hash.toLowerCase()}`);
  return id ? getTx(id) : null;
}
export async function putTx(tx: Tx) {
  await Promise.all([
    getRedis().set(`tx:${tx.id}`, tx),
    getRedis().set(`txhash:${tx.hash.toLowerCase()}`, tx.id),
  ]);
}

// ---- Withdrawals
export async function listWithdrawalsByWorker(workerId: string): Promise<Withdrawal[]> {
  const ids = await getRedis().smembers(`worker:${workerId}:withdrawals`);
  return (await getMany<Withdrawal>(ids.map((i) => `withdrawal:${i}`))).sort(byCreatedDesc);
}
export async function listAllWithdrawals(): Promise<Withdrawal[]> {
  const ids = await getRedis().smembers("withdrawals");
  return (await getMany<Withdrawal>(ids.map((i) => `withdrawal:${i}`))).sort(byCreatedDesc);
}
export async function putWithdrawal(w: Withdrawal) {
  await Promise.all([
    getRedis().set(`withdrawal:${w.id}`, w),
    getRedis().sadd("withdrawals", w.id),
    getRedis().sadd(`worker:${w.workerId}:withdrawals`, w.id),
  ]);
}

// ---- Notifications
const notifListKey = (r: Recipient) => `${r.type}:${r.id}:notifications`;
export async function pushNotification(n: Notification) {
  await Promise.all([
    getRedis().set(`notification:${n.id}`, n),
    getRedis().lpush(notifListKey(n.recipient), n.id),
  ]);
}
export async function listNotifications(recipient: Recipient, limit = 50): Promise<Notification[]> {
  const ids = await getRedis().lrange(notifListKey(recipient), 0, limit - 1);
  return getMany<Notification>(ids.map((i) => `notification:${i}`));
}
export async function markNotificationsRead(recipient: Recipient) {
  const items = await listNotifications(recipient, 200);
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;
  const r = getRedis();
  await Promise.all(unread.map((n) => r.set(`notification:${n.id}`, { ...n, read: true })));
}

// ---- FX
export const getFxRates = () => getRedis().get<FxRates>("fx:rates");
export const putFxRates = (rates: FxRates) => getRedis().set("fx:rates", rates);
export async function pushFxHistory(point: FxHistoryPoint) {
  await getRedis().lpush("fx:history", point);
  await getRedis().ltrim("fx:history", 0, 999);
}
export async function listFxHistory(limit = 30): Promise<FxHistoryPoint[]> {
  return getRedis().lrange<FxHistoryPoint>("fx:history", 0, limit - 1);
}

// ---- Admin
export async function flushAll() {
  await getRedis().flushdb();
}
