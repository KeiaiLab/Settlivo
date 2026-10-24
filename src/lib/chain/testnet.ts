import { createPublicClient, createWalletClient, erc20Abi, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import type { Stablecoin, Tx } from "@/lib/domain/types";
import { newId } from "@/lib/domain/ids";
import { getTx, putTx } from "@/lib/db/repo";
import { buildTransferCalldata } from "./memo";
import type { ChainAdapter, TransferRequest } from "./types";

const EXPLORER = "https://sepolia.basescan.org/tx/";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required for CHAIN_MODE=testnet`);
  return v;
}

export class TestnetChain implements ChainAdapter {
  private get usdc(): Address {
    return env("USDC_ADDRESS") as Address;
  }
  private get publicClient() {
    return createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL) });
  }
  private get walletClient() {
    const account = privateKeyToAccount(env("PLATFORM_PRIVATE_KEY") as `0x${string}`);
    return createWalletClient({ account, chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL) });
  }

  explorerUrl(hash: string): string {
    return `${EXPLORER}${hash}`;
  }

  async transfer(req: TransferRequest): Promise<Tx> {
    if (req.token !== "USDC") throw new Error("USDT not available on testnet");
    const units = BigInt(Math.round(Number(req.amount) * 1e6));
    const data = buildTransferCalldata(req.to as Address, units, req.memo);
    const wallet = this.walletClient;
    const hash = await wallet.sendTransaction({ to: this.usdc, data });
    const tx: Tx = {
      id: newId("tx"),
      hash,
      from: wallet.account.address,
      to: req.to,
      token: "USDC",
      amount: req.amount,
      status: "pending",
      calldata: data,
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
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: tx.hash as `0x${string}` });
    const confirmed: Tx = {
      ...tx,
      status: receipt.status === "success" ? "confirmed" : "failed",
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
      confirmedAt: new Date().toISOString(),
    };
    await putTx(confirmed);
    if (confirmed.status === "failed") throw new Error("transaction reverted");
    return confirmed;
  }

  async getBalance(address: string, token: Stablecoin): Promise<string> {
    if (token !== "USDC") return "0.000000";
    const raw = await this.publicClient.readContract({
      address: this.usdc,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address as Address],
    });
    return (Number(raw) / 1e6).toFixed(6);
  }
}
