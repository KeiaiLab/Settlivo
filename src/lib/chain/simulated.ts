import { randomBytes } from "node:crypto";
import type { Stablecoin, Tx } from "@/lib/domain/types";
import { newId } from "@/lib/domain/ids";
import { getRedis } from "@/lib/db/redis";
import { getTx, putTx } from "@/lib/db/repo";
import { buildTransferCalldata } from "./memo";
import { PLATFORM_SIM_ADDRESS, type ChainAdapter, type TransferRequest } from "./types";

const BLOCK_START = 21_400_000;
const balanceKey = (address: string, token: Stablecoin) => `sim:balance:${address.toLowerCase()}:${token}`;
const fmt = (units: number) => (units / 1e6).toFixed(6);
const toUnits = (amount: string) => Math.round(Number(amount) * 1e6);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class SimulatedChain implements ChainAdapter {
  explorerUrl(hash: string): string {
    return `/explorer/tx/${hash}`;
  }

  async transfer(req: TransferRequest): Promise<Tx> {
    const hash = `0x${randomBytes(32).toString("hex")}`;
    const tx: Tx = {
      id: newId("tx"),
      hash,
      from: PLATFORM_SIM_ADDRESS,
      to: req.to,
      token: req.token,
      amount: req.amount,
      status: "pending",
      calldata: buildTransferCalldata(req.to as `0x${string}`, BigInt(toUnits(req.amount)), req.memo),
      memo: req.memo,
      explorerUrl: this.explorerUrl(hash),
      createdAt: new Date().toISOString(),
    };
    await putTx(tx);
    return tx;
  }

  async waitForConfirmation(txId: string): Promise<Tx> {
    const tx = await getTx(txId);
    if (!tx) throw new Error(`tx ${txId} not found`);
    if (tx.status === "confirmed") return tx;
    const delay = Number(process.env.SIM_CONFIRM_MS ?? 2000 + Math.random() * 3000);
    await sleep(delay);
    const r = getRedis();
    const block = BLOCK_START + (await r.incr("sim:block"));
    const confirmed: Tx = {
      ...tx,
      status: "confirmed",
      blockNumber: block,
      gasUsed: 51_000 + Math.floor(Math.random() * 14_000),
      confirmedAt: new Date().toISOString(),
    };
    await putTx(confirmed);
    await this.adjustBalance(tx.to, tx.token, toUnits(tx.amount));
    await this.adjustBalance(tx.from, tx.token, -toUnits(tx.amount));
    return confirmed;
  }

  async getBalance(address: string, token: Stablecoin): Promise<string> {
    const units = Number((await getRedis().get<string | number>(balanceKey(address, token))) ?? 0);
    return fmt(units);
  }

  async setBalance(address: string, token: Stablecoin, amount: string): Promise<void> {
    await getRedis().set(balanceKey(address, token), toUnits(amount));
  }

  private async adjustBalance(address: string, token: Stablecoin, deltaUnits: number) {
    await getRedis().incrby(balanceKey(address, token), deltaUnits);
  }
}
