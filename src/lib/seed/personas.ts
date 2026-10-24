import type { LinkRequest, Org, Wallet, Worker } from "@/lib/domain/types";

export const ORG_ACME = "org_acme";
export const ORG_NORDWIND = "org_nordwind";

export const ORGS: Org[] = [
  {
    id: ORG_ACME,
    name: "Acme Remote",
    country: "US",
    currency: "USD",
    kybStatus: "verified",
    walletAddress: "0x5e77a1b2c3d4e5f60718293a4b5c6d7e8f901234",
    defaultWalletId: "wal_acme_tre",
    usdcBalance: "48250.000000",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: ORG_NORDWIND,
    name: "Nordwind Labs",
    country: "DE",
    currency: "EUR",
    kybStatus: "verified",
    walletAddress: "0x9a1f3c2e4b5d6e7f8091a2b3c4d5e6f708192a3b",
    defaultWalletId: "wal_nord_tre",
    usdcBalance: "21900.000000",
    createdAt: "2026-07-15T00:00:00.000Z",
  },
];

/** Org wallets: the treasury (default) plus an operations wallet each (§5.12). */
export const ORG_WALLETS: Wallet[] = [
  { id: "wal_acme_tre", owner: { type: "org", id: ORG_ACME }, label: "Treasury", address: ORGS[0].walletAddress, token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-06-01T00:00:00.000Z" },
  { id: "wal_acme_ops", owner: { type: "org", id: ORG_ACME }, label: "Operations", address: "0x4a6b8c0d2e4f60718293a4b5c6d7e8f901234abc", token: "USDC", kind: "external", status: "active", isDefault: false, createdAt: "2026-08-12T00:00:00.000Z" },
  { id: "wal_nord_tre", owner: { type: "org", id: ORG_NORDWIND }, label: "Treasury", address: ORGS[1].walletAddress, token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-07-15T00:00:00.000Z" },
  { id: "wal_nord_ops", owner: { type: "org", id: ORG_NORDWIND }, label: "EUR operations", address: "0x8c1d3e5f7a9b0c2d4e6f8091a2b3c4d5e6f7a8b9", token: "USDC", kind: "external", status: "active", isDefault: false, createdAt: "2026-09-02T00:00:00.000Z" },
];
export const ORG_WALLET_BALANCES: Record<string, string> = { wal_acme_ops: "12500.000000", wal_nord_ops: "4200.000000" };

const verified = { status: "verified" as const, steps: { identity: true, address: true, tax: true }, verifiedAt: "2026-08-01T09:00:00.000Z" };

export const WORKERS: Worker[] = [
  {
    id: "wrk_alice",
    name: "Alice Kim",
    email: "alice@settlivo.demo",
    country: "KR",
    localCurrency: "KRW",
    avatarInitials: "AK",
    orgIds: [ORG_ACME, ORG_NORDWIND],
    memberships: [{ orgId: ORG_ACME, status: "active", joinedAt: "2026-07-01T00:00:00.000Z" }, { orgId: ORG_NORDWIND, status: "active", joinedAt: "2026-07-20T00:00:00.000Z" }],
    kyc: verified,
    platformWallet: "0xa11ce0000000000000000000000000000000a11c",
    payoutPrefs: { wallet: "platform", walletId: "wal_alice_pf", stablecoin: "USDC", displayCurrency: "KRW", cadence: "monthly", bankAccount: { bankName: "KB Kookmin", accountMasked: "****2841", holder: "Alice Kim" } },
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "wrk_bob",
    name: "Bob Reyes",
    email: "bob@settlivo.demo",
    country: "PH",
    localCurrency: "PHP",
    avatarInitials: "BR",
    orgIds: [ORG_ACME],
    memberships: [{ orgId: ORG_ACME, status: "active", joinedAt: "2026-07-03T00:00:00.000Z" }],
    kyc: verified,
    platformWallet: "0xb0b0000000000000000000000000000000000b0b",
    payoutPrefs: { wallet: "external", externalAddress: "0x7c3e5a2b1d4f6e8a9b0c1d2e3f4a5b6c7d8e9f01", walletId: "wal_bob_ext", stablecoin: "USDT", displayCurrency: "PHP", cadence: "biweekly", bankAccount: { bankName: "BDO Unibank", accountMasked: "****7730", holder: "Bob Reyes" } },
    pendingPayoutPrefs: { wallet: "platform", walletId: "wal_bob_pf", stablecoin: "USDC", displayCurrency: "PHP", cadence: "biweekly", bankAccount: { bankName: "BDO Unibank", accountMasked: "****7730", holder: "Bob Reyes" }, submittedAt: "2026-10-23T14:20:00.000Z" },
    createdAt: "2026-07-03T00:00:00.000Z",
  },
  {
    id: "wrk_carlos",
    name: "Carlos Mendes",
    email: "carlos@settlivo.demo",
    country: "BR",
    localCurrency: "BRL",
    avatarInitials: "CM",
    orgIds: [ORG_ACME],
    memberships: [{ orgId: ORG_ACME, status: "active", joinedAt: "2026-07-10T00:00:00.000Z" }],
    kyc: verified,
    platformWallet: "0xca510000000000000000000000000000000ca510",
    payoutPrefs: { wallet: "platform", walletId: "wal_carlos_pf", stablecoin: "USDC", displayCurrency: "BRL", cadence: "monthly", bankAccount: { bankName: "Nubank", accountMasked: "****1190", holder: "Carlos Mendes" } },
    createdAt: "2026-07-10T00:00:00.000Z",
  },
  {
    id: "wrk_dana",
    name: "Dana Kowalski",
    email: "dana@settlivo.demo",
    country: "PL",
    localCurrency: "PLN",
    avatarInitials: "DK",
    orgIds: [ORG_NORDWIND],
    memberships: [{ orgId: ORG_NORDWIND, status: "active", joinedAt: "2026-07-20T00:00:00.000Z" }],
    kyc: verified,
    platformWallet: "0xda4a00000000000000000000000000000000da4a",
    payoutPrefs: { wallet: "platform", walletId: "wal_dana_pf", stablecoin: "USDC", displayCurrency: "PLN", cadence: "monthly", bankAccount: { bankName: "mBank", accountMasked: "****5522", holder: "Dana Kowalski" } },
    createdAt: "2026-07-20T00:00:00.000Z",
  },
  {
    id: "wrk_eun",
    name: "Eun Nguyen",
    email: "eun@settlivo.demo",
    country: "VN",
    localCurrency: "VND",
    avatarInitials: "EN",
    orgIds: [ORG_ACME],
    memberships: [{ orgId: ORG_ACME, status: "active", joinedAt: "2026-10-20T00:00:00.000Z" }],
    kyc: { status: "pending", steps: { identity: true, address: false, tax: false } },
    platformWallet: "0xe0000000000000000000000000000000000000e0",
    payoutPrefs: { wallet: "platform", walletId: "wal_eun_pf", stablecoin: "USDC", displayCurrency: "VND", cadence: "per_invoice" },
    createdAt: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "wrk_finn",
    name: "Finn Larsen",
    email: "finn@settlivo.demo",
    country: "DK",
    localCurrency: "EUR",
    avatarInitials: "FL",
    orgIds: [],
    memberships: [{ orgId: ORG_NORDWIND, status: "offboarded", joinedAt: "2026-07-22T00:00:00.000Z", leftAt: "2026-09-30T00:00:00.000Z" }],
    kyc: verified,
    platformWallet: "0xf1200000000000000000000000000000000f1200",
    payoutPrefs: { wallet: "platform", walletId: "wal_finn_pf", stablecoin: "USDC", displayCurrency: "EUR", cadence: "monthly", bankAccount: { bankName: "Danske Bank", accountMasked: "****9014", holder: "Finn Larsen" } },
    createdAt: "2026-07-22T00:00:00.000Z",
  },
];

/** Worker wallets: every worker has a platform wallet; Bob pays out to an external one, Alice also keeps one. */
export const WORKER_WALLETS: Wallet[] = [
  { id: "wal_alice_pf", owner: { type: "worker", id: "wrk_alice" }, label: "Settlivo wallet", address: "0xa11ce0000000000000000000000000000000a11c", token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "wal_alice_ext", owner: { type: "worker", id: "wrk_alice" }, label: "Ledger (cold)", address: "0x3b9d7f1e5c2a4868f0d1b2c3e4f5a6b7c8d9e0f1", token: "USDC", kind: "external", status: "active", isDefault: false, createdAt: "2026-09-05T00:00:00.000Z" },
  { id: "wal_bob_pf", owner: { type: "worker", id: "wrk_bob" }, label: "Settlivo wallet", address: "0xb0b0000000000000000000000000000000000b0b", token: "USDT", kind: "platform", status: "active", isDefault: false, createdAt: "2026-07-03T00:00:00.000Z" },
  { id: "wal_bob_ext", owner: { type: "worker", id: "wrk_bob" }, label: "MetaMask", address: "0x7c3e5a2b1d4f6e8a9b0c1d2e3f4a5b6c7d8e9f01", token: "USDT", kind: "external", status: "active", isDefault: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "wal_carlos_pf", owner: { type: "worker", id: "wrk_carlos" }, label: "Settlivo wallet", address: "0xca510000000000000000000000000000000ca510", token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-07-10T00:00:00.000Z" },
  { id: "wal_dana_pf", owner: { type: "worker", id: "wrk_dana" }, label: "Settlivo wallet", address: "0xda4a00000000000000000000000000000000da4a", token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "wal_eun_pf", owner: { type: "worker", id: "wrk_eun" }, label: "Settlivo wallet", address: "0xe0000000000000000000000000000000000000e0", token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-10-20T00:00:00.000Z" },
  { id: "wal_finn_pf", owner: { type: "worker", id: "wrk_finn" }, label: "Settlivo wallet", address: "0xf1200000000000000000000000000000000f1200", token: "USDC", kind: "platform", status: "active", isDefault: true, createdAt: "2026-07-22T00:00:00.000Z" },
];

export const LINK_REQUESTS: LinkRequest[] = [
  { id: "lrq_acme_bob", orgId: ORG_ACME, workerId: "wrk_bob", kind: "wallet", message: "Please link a USDC wallet for the Q4 bonus run.", status: "pending", createdAt: "2026-10-23T09:00:00.000Z" },
];

export type PersonaId = "admin_acme" | "admin_nordwind" | (typeof WORKERS)[number]["id"];

export interface Persona {
  id: PersonaId;
  role: "company" | "worker";
  name: string;
  subtitle: string;
  orgIds: string[];
  workerId?: string;
  flag: string;
}

export const PERSONAS: Persona[] = [
  { id: "admin_acme", role: "company", name: "Jordan Lee", subtitle: "Finance Lead · Acme Remote", orgIds: [ORG_ACME, ORG_NORDWIND], flag: "🇺🇸" },
  { id: "admin_nordwind", role: "company", name: "Mia Schulz", subtitle: "People Ops · Nordwind Labs", orgIds: [ORG_NORDWIND], flag: "🇩🇪" },
  ...WORKERS.filter((w) => w.orgIds.length > 0).map<Persona>((w) => ({
    id: w.id as PersonaId,
    role: "worker",
    name: w.name,
    subtitle: `${w.country} · ${w.localCurrency} · ${w.kyc.status === "verified" ? "Verified" : "KYC pending"}`,
    orgIds: w.orgIds,
    workerId: w.id,
    flag: { KR: "🇰🇷", PH: "🇵🇭", BR: "🇧🇷", PL: "🇵🇱", VN: "🇻🇳" }[w.country] ?? "🌐",
  })),
];
