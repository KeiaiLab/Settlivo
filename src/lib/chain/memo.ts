import { createHash } from "node:crypto";
import { encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";
import type { Invoice } from "@/lib/domain/types";

export interface Memo {
  invoiceId: string;
  invoiceHash: string;
}

const MARKER = "SETTLIVO|";
const TRANSFER_CALLDATA_HEX_LEN = 2 + 68 * 2; // "0x" + selector(4) + to(32) + amount(32)

type HashableInvoice = Pick<
  Invoice,
  "id" | "orgId" | "workerId" | "amount" | "currency" | "scheduledAt" | "memo" | "rateMode" | "lockedRate"
>;

/**
 * sha256 hex of the canonical invoice JSON (fixed key order). The pricing mode and, for fixed invoices,
 * the locked rate are part of the commitment; records without them hash as spread with no lock.
 */
export function invoiceHash(inv: HashableInvoice): string {
  const canonical = JSON.stringify({
    id: inv.id,
    orgId: inv.orgId,
    workerId: inv.workerId,
    amount: inv.amount,
    currency: inv.currency,
    scheduledAt: inv.scheduledAt,
    memo: inv.memo,
    rateMode: inv.rateMode ?? "spread",
    lockedRate: inv.lockedRate ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function encodeMemo(m: Memo): Hex {
  const bytes = Buffer.from(`${MARKER}${m.invoiceId}|${m.invoiceHash}`, "utf8");
  return `0x${bytes.toString("hex")}`;
}

/** Scan calldata after the 68-byte transfer payload for the Settlivo suffix. */
export function decodeMemo(calldata: Hex): Memo | null {
  if (calldata.length <= TRANSFER_CALLDATA_HEX_LEN) return null;
  const suffix = Buffer.from(calldata.slice(TRANSFER_CALLDATA_HEX_LEN), "hex").toString("utf8");
  const idx = suffix.indexOf(MARKER);
  if (idx < 0) return null;
  const [invoiceId, invoiceHash] = suffix.slice(idx + MARKER.length).split("|");
  if (!invoiceId || !invoiceHash) return null;
  return { invoiceId, invoiceHash };
}

export function buildTransferCalldata(to: Address, amountUnits: bigint, memo: Memo): Hex {
  const transfer = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amountUnits] });
  return `${transfer}${encodeMemo(memo).slice(2)}`;
}
