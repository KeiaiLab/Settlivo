export const SUPPORTED_CURRENCIES = ["USD", "KRW", "PHP", "BRL", "PLN", "VND", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export type Stablecoin = "USDC" | "USDT";

export type KycStatus = "pending" | "verified" | "rejected";

/** Subscription on the SENDING account (roadmap stage 1): the plan, not the transfer, carries the fee. */
export type PlanTier = "free" | "pro" | "business";
export interface Plan {
  tier: PlanTier;
  /** ISO; sends reset and the subscription renews here. */
  renewsAt: string;
  sendsThisMonth: number;
}

export interface Org {
  id: string;
  name: string;
  country: string;
  currency: Currency;
  kybStatus: "verified" | "pending";
  /** Address of the default wallet (kept in sync with `defaultWalletId`, §5.12). */
  walletAddress: string;
  defaultWalletId?: string;
  plan?: Plan;
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
  /** Wallet entity that receives payouts (§5.12); `wallet`/`externalAddress` describe it for older records. */
  walletId?: string;
  stablecoin: Stablecoin;
  displayCurrency: Currency;
  cadence: "monthly" | "biweekly" | "per_invoice";
  bankAccount?: BankAccount;
}

/** One entry per organisation the worker has ever belonged to (§5.11). */
export interface Membership {
  orgId: string;
  status: "active" | "offboarding" | "offboarded";
  joinedAt: string;
  leftAt?: string;
  finalInvoiceId?: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  country: string;
  localCurrency: Currency;
  avatarInitials: string;
  /** Derived: org ids whose membership is not `offboarded`. */
  orgIds: string[];
  /** Missing on records written before §5.11; `memberships()` derives it from `orgIds`. */
  memberships?: Membership[];
  kyc: {
    status: KycStatus;
    steps: { identity: boolean; address: boolean; tax: boolean };
    verifiedAt?: string;
  };
  platformWallet: string;
  plan?: Plan;
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
  blockedReason?: "kyc" | "plan";
  quoteRate: number;
  executedRate?: number;
  usdcAmount?: string;
  /** FX pricing model (§5.2); undefined on records written before pricing modes and means `spread`. */
  rateMode?: "spread" | "fixed";
  /** Settlement fee charged to the company, in basis points: 50 for spread, 110 for fixed. */
  feeBps?: number;
  /** fixed only: the rate frozen at issue (= quoteRate). */
  lockedRate?: number;
  /** fixed only: ISO; the lock holds until scheduledAt + 24 h. */
  lockExpiresAt?: string;
  /** Rate actually used to compute usdcAmount at settlement. */
  appliedRate?: number;
  /** 6-dp fee charged to the company on top of usdcAmount. */
  feeUsdc?: string;
  /** fixed invoice settled after the lock window (fell back to the market rate). */
  lockExpired?: boolean;
  txId?: string;
  invoiceHash: string;
  runId?: string;
  payrollRunId?: string;
  /** Worker wallet that was (or will be) paid, snapshotted at settlement. */
  payoutWalletId?: string;
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
  | "invoice_rate_lock_expired"
  | "invoice_blocked_plan"
  | "plan_upgraded"
  | "prefs_submitted"
  | "prefs_approved"
  | "prefs_rejected"
  | "withdrawal_completed"
  | "kyc_verified"
  | "worker_invited"
  | "worker_offboarded"
  | "wallet_added"
  | "link_requested"
  | "link_accepted"
  | "link_declined";

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

export interface Wallet {
  id: string;
  owner: Recipient;
  label: string;
  address: string;
  token: Stablecoin;
  kind: "platform" | "external";
  status: "active" | "revoked";
  isDefault: boolean;
  createdAt: string;
}

/** A company asking a worker to link a wallet or bank account (§5.12). */
export interface LinkRequest {
  id: string;
  orgId: string;
  workerId: string;
  kind: "wallet" | "bank";
  message: string;
  status: "pending" | "accepted" | "declined";
  walletId?: string;
  createdAt: string;
  resolvedAt?: string;
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
