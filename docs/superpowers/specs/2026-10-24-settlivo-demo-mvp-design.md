# Settlivo Demo MVP — Design Spec

Date: 2026-10-24
Status: Approved for planning
Deadline: 2026-10-24 15:00 KST

## 1. Purpose

Settlivo is a stablecoin-based global settlement platform for companies that
hire remote workers abroad. This spec describes an investor/judge demo MVP.

Success criterion: a judge watching a 3–5 minute walkthrough understands the
product end to end — a company issues an invoice, a worker approves it, the
platform settles in USDC at a live FX rate at a scheduled time, and the worker
cashes out to local currency — and believes the product is complete.

Demo believability outranks real-money correctness. Every subsystem must look
and behave like a finished product; it does not need to move real funds.

Out of scope for this build: real authentication, real KYC providers, real
on/off-ramp partners, mainnet, multi-tenant security, email delivery.
Each of these appears in the demo as a simulation (see §6).

## 2. Users and personas

Login is a persona picker (no passwords). The login page looks like a real
sign-in page; the "Sign in with Google" button also opens the persona picker.

Seeded personas:

| Persona | Role | Org | Notes |
| --- | --- | --- | --- |
| Company admin A | company | Acme Remote (US) | primary demo company |
| Company admin B | company | Nordwind Labs (DE) | second org for switcher |
| Worker: Alice | worker | Acme, Nordwind | KR, KRW, verified, platform wallet |
| Worker: Bob | worker | Acme | PH, PHP, verified, external wallet |
| Worker: Carlos | worker | Acme | BR, BRL, verified |
| Worker: Dana | worker | Nordwind | PL, PLN, verified |
| Worker: Eun | worker | Acme | VN, VND, KYC pending → payouts blocked |

UI language: English. Visual direction: dark fintech, data-dense, calm.

## 3. Architecture

Single Next.js (App Router) application deployed on Vercel.

Components:

- **Web app** — company and worker screens. Writes via Server Actions.
  Reads refresh by polling every 3 s (SWR or `router.refresh`).
- **Upstash Redis** (Vercel Marketplace) — all application state as JSON
  documents. No relational schema.
- **Scheduler** — one of two interchangeable engines behind a single
  `scheduleInvoice(invoiceId)` interface, selected by `SCHEDULER=workflow|tick`:
  - `workflow`: Vercel Workflow SDK. One run per invoice. Uses `createHook`
    for approval, `sleep` until the scheduled time, then settlement steps.
  - `tick`: `/api/tick` route invoked by client polling; processes invoices
    whose scheduled time has passed. Fallback if Workflow deployment is
    unreliable.
- **Chain adapter** — `ChainAdapter` interface with two implementations,
  selected by `CHAIN_MODE=simulated|testnet`:
  - `simulated` (default): generates realistic tx hashes, block numbers,
    gas, 2–5 s confirmation delay; stores tx records in Redis; backs the
    in-app explorer.
  - `testnet`: viem + Base Sepolia + Circle test USDC. Platform hot wallet
    signs all transfers. Implemented, only enabled if time allows.
- **FX service** — free keyless FX API with hardcoded fallback rates.

Vercel surface used: Hosting, Workflow, Marketplace (Upstash), env vars,
preview/production deployments.

## 4. Data model (Redis)

One JSON document per key; membership tracked in Sets. All IDs are short
prefixed strings (`inv_…`, `wrk_…`, `org_…`, `tx_…`, `ntf_…`, `wd_…`).

```
org:{id}            { id, name, country, currency, kybStatus, walletAddress,
                      usdcBalance (simulated), createdAt }
orgs                Set<orgId>

worker:{id}         { id, name, email, country, localCurrency, avatarInitials,
                      orgIds[], kyc: { status: pending|verified|rejected,
                      steps: {identity, address, tax}, verifiedAt },
                      platformWallet: address,
                      payoutPrefs: { wallet: platform|external,
                        externalAddress?, displayCurrency, cadence:
                        monthly|biweekly|per_invoice, bankAccount?: {…} },
                      pendingPayoutPrefs?: same shape + submittedAt }
workers             Set<workerId>
org:{id}:workers    Set<workerId>

invoice:{id}        { id, orgId, workerId, initiatedBy: company|worker,
                      amount, currency, memo, scheduledAt,
                      status, quoteRate, executedRate, usdcAmount,
                      txId, invoiceHash, runId, payrollRunId?,
                      error?, history: [{status, at, by}] , createdAt }
invoices            Set<invoiceId>
org:{id}:invoices   Set<invoiceId>
worker:{id}:invoices Set<invoiceId>

payrollrun:{id}     { id, orgId, invoiceIds[], status, createdAt }
tx:{id}             { id, hash, from, to, token:"USDC", amount, blockNumber,
                      gasUsed, status: pending|confirmed|failed,
                      calldata, memo: { invoiceId, invoiceHash },
                      explorerUrl, createdAt, confirmedAt }
withdrawal:{id}     { id, workerId, usdcAmount, currency, rate, fee,
                      localAmount, eta, status: processing|completed,
                      bankAccountMasked, createdAt, completedAt }
notification:{id}   { id, recipient: {type: org|worker, id}, kind, title,
                      body, href, read, createdAt }
{org|worker}:{id}:notifications  List<notificationId> (newest first)
fx:rates            { base:"USD", rates:{KRW,PHP,BRL,PLN,VND,EUR,USD},
                      fetchedAt, source: live|fallback }
fx:history          List<{at, rates}>  (for the rate chart)
```

Invoice status machine:

```
draft → pending_approval → scheduled → sending → confirmed
                 ↓                        ↓
              rejected                  failed  → (retry) scheduled
```

`sending` is also blocked (stays `scheduled`, flagged `blocked_kyc`) when the
worker's KYC status is not `verified`.

## 5. Core flows

### 5.1 Scenario 1 — company invoice → worker approval → scheduled payout

1. Company admin opens "New invoice": worker, amount, currency (defaults to
   worker's local currency), scheduled time (default now + 2 min), memo.
2. Server Action stores the invoice as `pending_approval`, records
   `quoteRate` from the FX service, computes `invoiceHash =
   sha256(canonical JSON of {id, orgId, workerId, amount, currency,
   scheduledAt, memo})`, creates a worker notification, and calls
   `scheduleInvoice(id)`.
3. Worker sees the invoice under "Needs your approval", reviews the
   details, and clicks Approve or Reject. Approve calls
   `resumeHook("approve:"+id, {approved:true})` (workflow) or sets status
   directly (tick). Company is notified.
4. At `scheduledAt` the scheduler runs settlement (§5.4).
5. Both parties see the status timeline advance in near real time.

### 5.2 Scenario 2 — currency-based amount, FX fixed at send time

- Invoices are denominated in the worker's local currency.
- `quoteRate` is captured at creation; `executedRate` is re-fetched
  immediately before sending. `usdcAmount = floor(amount / executedRate,
  6 dp)` for non-USD currencies (rates are per 1 USD).
- Invoice detail shows quote rate, executed rate, delta (%) and the USDC
  amount, plus a small FX history sparkline.
- FX service: fetch from a keyless public API; on failure use hardcoded
  fallback rates and mark `source: fallback` (shown as a subtle badge).
  In simulated mode the service also applies a ±0.3 % random drift at
  send time so the quote/executed delta is visible in the demo.

### 5.3 Scenario 3 — worker chooses payout conditions, company approves

- Worker "Payout settings": wallet (platform wallet or external address),
  display currency, cadence (monthly / biweekly / per invoice), bank
  account for off-ramp.
- Submitting writes `pendingPayoutPrefs` and notifies every org the
  worker belongs to.
- Company dashboard "Approvals" lists pending changes with a diff view.
  Approve moves pending → active; Reject discards with a reason.
- Settlement always pays the active wallet. Worker-initiated invoices
  (worker "Request payment") reuse the invoice object with
  `initiatedBy: worker`; the company approves instead of the worker.

### 5.4 Settlement step (shared by both scheduler engines)

```
load invoice
if worker.kyc.status != verified → flag blocked_kyc, notify company, stop
status = sending
executedRate = fx.getRate(currency)
usdcAmount = convert(amount, executedRate)
tx = chain.transferUSDC({ to: worker active wallet, amount: usdcAmount,
                          memo: { invoiceId, invoiceHash } })
await chain.waitForConfirmation(tx)
status = confirmed, store txId, executedRate, usdcAmount
notify worker ("You received …") and company ("Settled …")
on error → status = failed, store error, notify company
```

Retry from the invoice detail page re-runs the settlement step.

### 5.5 Payroll Run (batch)

Company selects several workers, enters amounts (prefilled from the last
confirmed invoice per worker), and runs payroll. The run creates one
invoice per worker with `scheduledAt = now` and `payrollRunId`, pre-approved
(company-initiated batch skips worker approval, matching cadence-based
salaries). The run page shows each transfer confirming sequentially about
1 s apart, labeled "Batch settlement contract call". A run summary shows
total USDC, total local-currency equivalent, fees, and bank-wire comparison.

### 5.6 On-chain invoice record

Transfer calldata = ERC-20 `transfer(to, amount)` (68 bytes) followed by a
UTF-8 suffix: `SETTLIVO|{invoiceId}|{invoiceHash}`. The USDC contract
ignores trailing calldata; the suffix is permanently recorded in the tx
input. The simulated adapter stores the same calldata.

Invoice detail "On-chain record" card: reads the tx (Redis in simulated
mode, RPC in testnet mode), decodes the suffix, recomputes the hash from
the stored invoice, and shows "Verified" or "Mismatch". Links to the
in-app explorer (simulated) or Basescan (testnet).

### 5.7 Off-ramp simulation

Worker "Withdraw to {localCurrency}": enter USDC amount → shows rate, fee
(0.5 %), local amount, ETA ("~10 minutes"), and a comparison row for a
bank wire (typical 3–5 business days, $25–45 fees + 1.5–3 % FX spread).
Confirm creates a withdrawal in `processing`; it flips to `completed`
after ~8 s. Simulated USDC balance decreases accordingly.

### 5.8 KYC simulation

Worker onboarding wizard (3 steps: identity document upload stub, address,
tax info). Completing all steps sets `kyc.status = verified` after a 3 s
"Reviewing…" state. Seeded worker Eun stays `pending` to demonstrate the
"payout blocked until verified" path; the demo can verify Eun live from
their persona. Company shows a KYB "Verified" card.

### 5.9 Notifications

In-app bell with unread count on both roles. Events: invoice created,
approved, rejected, scheduled, settled, failed, blocked; payout prefs
submitted/approved; withdrawal completed; KYC verified. Each notification
links to the relevant page. Actions that would send email show an
"Email sent to …" toast.

### 5.10 Multi-org

Company admin A can switch orgs via a header menu (Acme ↔ Nordwind).
Switching changes the active `orgId` in the session cookie; all company
pages are scoped by it. Alice appears in both orgs with separate invoice
histories.

## 6. Screens

Routes (all under one app):

- `/login` — persona picker styled as a sign-in page.
- `/company` — dashboard: USDC balance, this-month payout total,
  savings widget (fees and days saved vs bank wires), workers table (KYC
  badge, wallet type, local currency), recent invoices, pending approvals.
- `/company/invoices` — table with status filter; `/company/invoices/new`.
- `/company/invoices/[id]` — status timeline, FX comparison, on-chain
  record card, retry button on failure.
- `/company/payroll` — Payroll Run builder; `/company/payroll/[runId]`.
- `/company/workers/[id]` — worker profile, payout prefs, history.
- `/company/approvals` — pending payout-pref changes and worker-initiated
  invoices.
- `/worker` — balance (USDC + local equivalent), "Needs your approval",
  recent settlements, withdraw CTA, KYC banner if not verified.
- `/worker/invoices/[id]` — same detail as company view, worker actions.
- `/worker/request` — worker-initiated invoice form.
- `/worker/withdraw` — off-ramp simulation.
- `/worker/settings` — payout settings (wallet, currency, cadence, bank).
- `/worker/onboarding` — KYC wizard.
- `/explorer/tx/[hash]` — in-app explorer page for simulated transactions
  (hash, block, from/to, amount, gas, decoded calldata with the Settlivo
  memo).
- `/notifications` — full list for the current persona.

Worker routes are responsive down to 375 px. Company routes target desktop
but must not break on tablet widths.

## 7. Seed data

A `seed` script (idempotent, `FLUSH` optional) populates:

- 2 orgs, 5 workers, memberships as in §2.
- ~24 historical invoices across the last 3 months (mixed statuses, mostly
  confirmed) with matching tx records and FX history.
- 2 past payroll runs.
- 3 withdrawals (completed).
- ~15 notifications per persona, some unread.
- FX history for the last 30 days (synthetic with mild noise).

Demo reset: a `/api/seed` route guarded by `SEED_SECRET` re-seeds in one
call so the presenter can restore state between rehearsals.

## 8. Error handling and fallbacks

- Settlement failure → `failed` with reason; detail page offers Retry.
- FX fetch failure → fallback rates, `source: fallback` badge.
- Workflow unavailable → switch `SCHEDULER=tick`; no code change.
- Testnet unavailable → `CHAIN_MODE=simulated` (default anyway).
- Redis unavailable → app shows a single "service unavailable" page;
  no silent fallbacks.
- KYC not verified at send time → invoice stays `scheduled` with a
  `blocked_kyc` flag and company notification; verifying the worker and
  pressing Retry sends it.

## 9. Testing

Unit tests (Vitest) for pure modules only:

- calldata memo encode/decode round trip and hash verification;
- FX conversion and 6-dp floor, fallback selection;
- invoice status transitions (valid/invalid moves, KYC block).

Manual end-to-end rehearsal script (kept in `docs/demo-script.md`):
login as company → create invoice for Alice (now + 2 min) → login as Alice
→ approve → watch settlement → open on-chain record → withdraw to KRW →
back to company → run payroll for 3 workers → approve Bob's wallet change
→ switch to Nordwind → show Alice's second history.

Workflow integration tests are skipped for time; the `tick` engine is the
tested path if Workflow misbehaves.

## 10. Configuration

```
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (Marketplace)
SCHEDULER=workflow|tick            default workflow
CHAIN_MODE=simulated|testnet       default simulated
SEED_SECRET                        protects /api/seed
# testnet only
BASE_SEPOLIA_RPC_URL
PLATFORM_PRIVATE_KEY
WORKER_WALLET_MNEMONIC
USDC_ADDRESS                        Base Sepolia USDC
FX_API_URL                          optional override
```

## 11. Timeline (2026-10-24)

| By | Milestone |
| --- | --- |
| 11:10 | Spec + implementation plan written |
| 11:35 | Repo scaffolded, Vercel linked, Upstash provisioned, first deploy green |
| 12:30 | Data layer, seed, simulated chain adapter, scheduler + settlement |
| 13:45 | Company screens and worker screens functional |
| 14:30 | Notifications, explorer, payroll run, off-ramp, KYC wizard, org switch, responsive pass |
| 15:00 | Rehearsal done, production deploy, README updated with demo script |

Stretch (only after 14:30 if everything above is done): enable
`CHAIN_MODE=testnet` on Base Sepolia and record one real tx hash.
