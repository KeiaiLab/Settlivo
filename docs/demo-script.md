# Settlivo demo script (≈5 minutes)

Production: https://settlivo.vercel.app
Reset data between rehearsals:

```bash
curl -X POST https://settlivo.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'
```

| # | Persona | Do | Say / what the judge sees |
| --- | --- | --- | --- |
| 1 | — | Open `/login` | "No passwords for the demo. Two companies, five workers in five currencies." |
| 2 | Jordan Lee (Acme) | Dashboard | Treasury in USDC, paid-this-month, savings vs bank wires, pending items (Carlos request, Bob settings, Eun blocked). |
| 3 | Jordan | New invoice → Alice, 4,200,000 KRW, settle in 2 min, memo "October salary" → Issue | Status *Awaiting approval*. Quote rate captured now; final rate locked at send. |
| 4 | Alice Kim | Sign out → sign in as Alice → Home | "Needs your approval" card. Approve. Toast "Email sent". |
| 5 | Alice | Open the invoice | Timeline advances: Approved → Settling → Confirmed within ~2 min. FX card shows quote vs executed and the delta. |
| 6 | Alice | On-chain record → explorer link | Tx hash, block, calldata with `SETTLIVO|inv_…|sha256`. "Verified" badge = hash in calldata matches the invoice. |
| 7 | Alice | Withdraw → 500 USDC → Withdraw to KRW | Side-by-side vs bank wire. Status Processing → Completed in ~8 s. Balance drops. |
| 8 | Jordan | Approvals | Approve Bob's wallet change (diff view). Approve Carlos's payment request → it schedules. |
| 9 | Jordan | Payroll → Run payroll now | Three transfers confirm one after another. Totals, savings. |
| 10 | Jordan | Invoices → Eun's blocked salary | "Blocked · KYC". |
| 11 | Eun Nguyen | Sign in as Eun → Continue verification → 3 steps → Reviewing… → Verified | Banner disappears. |
| 12 | Jordan | Eun's invoice → Retry settlement | Settles. |
| 13 | Jordan | Org switcher → Nordwind Labs | Separate treasury, Alice appears with a second history. |

Talking points: USDC by default for compliance (MiCA / monthly attestations); USDT selectable per worker. Testnet mode (`CHAIN_MODE=testnet`) sends real Base Sepolia USDC with the same calldata memo.
