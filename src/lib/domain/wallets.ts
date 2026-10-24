import { createHash } from "node:crypto";
import type { Wallet } from "./types";

/** Deterministic simulated address for platform-custodied wallets (sha256 of a seed string). */
export function platformAddress(seed: string): string {
  return `0x${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`;
}

export const isAddress = (s: string) => /^0x[0-9a-f]{40}$/.test(s);

/** The wallet settlements pay to / from: the default active one, else the first active one. */
export function defaultWallet(wallets: Wallet[]): Wallet | undefined {
  const active = wallets.filter((w) => w.status === "active");
  return active.find((w) => w.isDefault) ?? active[0];
}

export function markDefault(wallets: Wallet[], walletId: string): Wallet[] {
  return wallets.map((w) => ({ ...w, isDefault: w.id === walletId }));
}
