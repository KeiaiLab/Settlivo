import type { Org, Worker } from "@/lib/domain/types";

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
    usdcBalance: "21900.000000",
    createdAt: "2026-07-15T00:00:00.000Z",
  },
];

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
    kyc: verified,
    platformWallet: "0xa11ce0000000000000000000000000000000a11c",
    payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "KRW", cadence: "monthly", bankAccount: { bankName: "KB Kookmin", accountMasked: "****2841", holder: "Alice Kim" } },
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
    kyc: verified,
    platformWallet: "0xb0b0000000000000000000000000000000000b0b",
    payoutPrefs: { wallet: "external", externalAddress: "0x7c3e5a2b1d4f6e8a9b0c1d2e3f4a5b6c7d8e9f01", stablecoin: "USDT", displayCurrency: "PHP", cadence: "biweekly", bankAccount: { bankName: "BDO Unibank", accountMasked: "****7730", holder: "Bob Reyes" } },
    pendingPayoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "PHP", cadence: "biweekly", bankAccount: { bankName: "BDO Unibank", accountMasked: "****7730", holder: "Bob Reyes" }, submittedAt: "2026-10-23T14:20:00.000Z" },
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
    kyc: verified,
    platformWallet: "0xca510000000000000000000000000000000ca510",
    payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "BRL", cadence: "monthly", bankAccount: { bankName: "Nubank", accountMasked: "****1190", holder: "Carlos Mendes" } },
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
    kyc: verified,
    platformWallet: "0xda4a00000000000000000000000000000000da4a",
    payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "PLN", cadence: "monthly", bankAccount: { bankName: "mBank", accountMasked: "****5522", holder: "Dana Kowalski" } },
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
    kyc: { status: "pending", steps: { identity: true, address: false, tax: false } },
    platformWallet: "0xe0000000000000000000000000000000000000e0",
    payoutPrefs: { wallet: "platform", stablecoin: "USDC", displayCurrency: "VND", cadence: "per_invoice" },
    createdAt: "2026-10-20T00:00:00.000Z",
  },
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
  ...WORKERS.map<Persona>((w) => ({
    id: w.id as PersonaId,
    role: "worker",
    name: w.name,
    subtitle: `${w.country} · ${w.localCurrency} · ${w.kyc.status === "verified" ? "Verified" : "KYC pending"}`,
    orgIds: w.orgIds,
    workerId: w.id,
    flag: { KR: "🇰🇷", PH: "🇵🇭", BR: "🇧🇷", PL: "🇵🇱", VN: "🇻🇳" }[w.country] ?? "🌐",
  })),
];
