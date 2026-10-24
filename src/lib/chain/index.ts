import { SimulatedChain } from "./simulated";
import { TestnetChain } from "./testnet";
import type { ChainAdapter } from "./types";

export type { ChainAdapter, TransferRequest } from "./types";
export { PLATFORM_SIM_ADDRESS } from "./types";

export function chainMode(): "simulated" | "testnet" {
  return process.env.CHAIN_MODE === "testnet" ? "testnet" : "simulated";
}

export function getChain(): ChainAdapter {
  return chainMode() === "testnet" ? new TestnetChain() : new SimulatedChain();
}
