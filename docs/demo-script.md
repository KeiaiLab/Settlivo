# Settlivo demo script (≈5 minutes)

Production: https://settlivo.vercel.app
Reset data between rehearsals: sign out, then press **Reset demo data** at the bottom of `/login` and enter the reset code (`SEED_SECRET`). Equivalent from a shell:

```bash
curl -X POST https://settlivo.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'
```

| # | Persona | Do | Say / what the judge sees |
| --- | --- | --- | --- |
| 1 | — | Open `/login` | "No passwords for the demo. Two companies, five workers in five currencies." |
| 2 | Jordan Lee (Acme) | Dashboard | Treasury in USDC, paid-this-month, savings vs bank wires, pending items (Carlos request, Bob settings, Eun blocked). |
| 3 | Jordan | New invoice → Alice, 4,200,000 KRW, Rate *Spread* (or *Fixed* to lock today's rate for 24 h at a 1.1% fee), settle in 2 min, memo "October salary" → Issue | Status *Awaiting approval*. Live preview shows the USDC equivalent and fee; spread locks the rate at send, fixed locks it now. |
| 4 | Alice Kim | Sign out → sign in as Alice → Home | "Needs your approval" card. Approve. Toast "Email sent". |
| 5 | Alice | Open the invoice | Timeline advances: Approved → Settling → Confirmed within ~2 min. FX card shows pricing mode, quote vs executed, the applied rate and fee. |
| 6 | Alice | On-chain record → explorer link | Tx hash, block, calldata with `SETTLIVO|inv_…|sha256`. "Verified" badge = hash in calldata matches the invoice. |
| 7 | Alice | Withdraw → 500 USDC → Withdraw to KRW | Side-by-side vs bank wire. Status Processing → Completed in ~8 s. Balance drops. |
| 8 | Jordan | Approvals | Approve Bob's wallet change (diff view). Approve Carlos's payment request → it schedules. |
| 9 | Jordan | Payroll → Run payroll now | Three transfers confirm one after another. Totals, savings. |
| 10 | Jordan | Invoices → Eun's blocked salary | "Blocked · KYC". |
| 11 | Eun Nguyen | Sign in as Eun → Continue verification → 3 steps → Reviewing… → Verified | Banner disappears. |
| 12 | Jordan | Eun's invoice → Retry settlement | Settles. |
| 13 | Jordan | Org switcher → Nordwind Labs | Separate treasury, Alice appears with a second history. |

## Extended walkthrough (ontology, subscription)

Steps 14–18 continue from step 13 and show the entity model behind every screen — a user administers organizations that own wallets, hold memberships with workers and carry a subscription plan; a worker owns wallets and answers link requests — as defined in the spec, §4.1 (ontology), §5.2 (plans / subscription), §5.11 (worker lifecycle) and §5.12 (wallets).

| # | Persona | Do | Say / what the judge sees |
| --- | --- | --- | --- |
| 14 | Jordan | Org switcher → Acme Remote → Workers → Add worker (Mateo Ruiz, mateo@settlivo.demo, ES, EUR) | Lands on the new profile: badge *Active*, KYC pending, a Settlivo wallet created on the spot; Mateo gets an invitation notification. |
| 15 | Jordan | Wallets | One card per company Jordan administers: Acme (Treasury, Operations), Nordwind (Treasury, EUR operations), balance per wallet and the default marker. Add wallet "Bonus pool" → it appears under Acme. |
| 16 | Jordan | Workers → Bob Reyes → Final payment 10,000 PHP → Offboard | Badge *Offboarding* while the final invoice settles on-chain, then *Former*. Bob moves to "Former workers" on the list; his history stays. |
| 17 | Alice Kim | Sign out → sign in as Alice → Settings | Wallets card: the Settlivo wallet is marked *Payout wallet*, Ledger (cold) is her external one. Add wallet "Rabby" → listed. Link requests from companies (Bob has one from Acme) are accepted or declined here. |
| 18 | Jordan | Sign out → sign in as Jordan → Org switcher → Nordwind → Payroll → Run payroll now | Rows show *Blocked · Plan* (Free, 3 of 3 sends used). Billing → Upgrade to Business → run completes, fees 0. |

## Run it yourself

```bash
npx playwright install chromium        # once
npm run e2e                            # seeds .data/kv-e2e.json, starts next dev on :3100, walks all 18 steps
PLAYWRIGHT_BASE_URL=https://settlivo.vercel.app SEED_SECRET=… npm run e2e   # same walkthrough against production (re-seeds it first)
```

Talking points: USDC by default for compliance (MiCA / monthly attestations); USDT selectable per worker. Testnet mode (`CHAIN_MODE=testnet`) sends real Base Sepolia USDC with the same calldata memo.
