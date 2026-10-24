import type { Stablecoin, Tx } from "@/lib/domain/types";
import type { Memo } from "./memo";

export interface TransferRequest {
  token: Stablecoin;
  to: string;
  /** 6-dp decimal string */
  amount: string;
  memo: Memo;
}

export interface ChainAdapter {
  transfer(req: TransferRequest): Promise<Tx>;
  waitForConfirmation(txId: string): Promise<Tx>;
  getBalance(address: string, token: Stablecoin): Promise<string>;
  explorerUrl(hash: string): string;
}

export const PLATFORM_SIM_ADDRESS = "0x5e77a1B2c3D4E5f60718293A4b5C6d7E8F901234";
