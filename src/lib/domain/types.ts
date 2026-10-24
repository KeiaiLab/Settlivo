export const SUPPORTED_CURRENCIES = ["USD", "KRW", "PHP", "BRL", "PLN", "VND", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export type Stablecoin = "USDC" | "USDT";

export type KycStatus = "pending" | "verified" | "rejected";

export interface Org {
  id: string;
  name: string;
  country: string;
  currency: Currency;
  kybStatus: "verified" | "pending";
  walletAddress: string;
  usdcBalance: string; // simulated, 6dp string
  createdAt: string;
}

export interface BankAccount {
  bankName: string;
  accountMasked: string; // e.g. "****1234"
  holder: string;
}

export interface PayoutPrefs {
  wallet: "platform" | "external";
  externalAddress?: string;
  stablecoin: Stablecoin;
  displayCurrency: Currency;
  cadence: "monthly" | "biweekly" | "per_invoice";
  bankAccount?: BankAccount;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  country: string;
  localCurrency: Currency;
  avatarInitials: string;
  orgIds: string[];
  kyc: {
    status: KycStatus;
    steps: { identity: boolean; address: boolean; tax: boolean };
    verifiedAt?: string;
  };
  platformWallet: string;
  payoutPrefs: PayoutPrefs;
  pendingPayoutPrefs?: PayoutPrefs & { submittedAt: string };
  createdAt: string;
}

export type InvoiceStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "sending"
  | "confirmed"
  | "rejected"
  | "failed";

export interface InvoiceHistoryEntry {
  status: InvoiceStatus;
  at: string;
  by: string;
  note?: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  workerId: string;
  initiatedBy: "company" | "worker";
  amount: number;
  currency: Currency;
  stablecoin: Stablecoin;
  memo: string;
  scheduledAt: string;
  status: InvoiceStatus;
  blockedReason?: "kyc";
  quoteRate: number;
  executedRate?: number;
  usdcAmount?: string;
  txId?: string;
  invoiceHash: string;
  runId?: string;
  payrollRunId?: string;
  error?: string;
  rejectReason?: string;
  history: InvoiceHistoryEntry[];
  createdAt: string;
}

export interface PayrollRun {
  id: string;
  orgId: string;
  invoiceIds: string[];
  status: "running" | "completed" | "partial";
  createdAt: string;
}

export interface Tx {
  id: string;
  hash: string;
  from: string;
  to: string;
  token: Stablecoin;
  amount: string;
  blockNumber?: number;
  gasUsed?: number;
  status: "pending" | "confirmed" | "failed";
  calldata: `0x${string}`;
  memo: { invoiceId: string; invoiceHash: string };
  explorerUrl: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface Withdrawal {
  id: string;
  workerId: string;
  usdcAmount: string;
  currency: Currency;
  rate: number;
  fee: string;
  localAmount: number;
  eta: string;
  status: "processing" | "completed";
  bankAccountMasked: string;
  createdAt: string;
  completedAt?: string;
}

export type NotificationKind =
  | "invoice_created"
  | "invoice_approved"
  | "invoice_rejected"
  | "invoice_scheduled"
  | "invoice_settled"
  | "invoice_failed"
  | "invoice_blocked"
  | "prefs_submitted"
  | "prefs_approved"
  | "prefs_rejected"
  | "withdrawal_completed"
  | "kyc_verified";

export interface Recipient {
  type: "org" | "worker";
  id: string;
}

export interface Notification {
  id: string;
  recipient: Recipient;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface FxRates {
  base: "USD";
  rates: Record<Currency, number>;
  fetchedAt: string;
  source: "live" | "fallback";
}

export interface FxHistoryPoint {
  at: string;
  rates: Record<Currency, number>;
}
