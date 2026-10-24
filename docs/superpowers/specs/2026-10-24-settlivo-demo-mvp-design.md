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
  documents. No relational schema. Without Upstash credentials (local dev,
  e2e) the same repository runs on a JSON file store at `.data/kv.json`
  (`KV_MODE=file`).
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
    USDT has no official testnet token, so testnet mode supports USDC only;
    the simulated adapter supports both.
- **FX service** — free keyless FX API with hardcoded fallback rates.

Vercel surface used: Hosting, Workflow, Marketplace (Upstash), env vars,
preview/production deployments.

## 4. Data model (Redis)

One JSON document per key; membership tracked in Sets. All IDs are short
prefixed strings (`inv_…`, `wrk_…`, `org_…`, `tx_…`, `ntf_…`, `wd_…`, `wal_…`,
`lrq_…`).

```
org:{id}            { id, name, country, currency, kybStatus, walletAddress,
                      usdcBalance (simulated), plan?, createdAt }
orgs                Set<orgId>

worker:{id}         { id, name, email, country, localCurrency, avatarInitials,
                      orgIds[], kyc: { status: pending|verified|rejected,
                      steps: {identity, address, tax}, verifiedAt },
                      platformWallet: address,
                      payoutPrefs: { wallet: platform|external,
                        externalAddress?, stablecoin: USDC|USDT,
                        displayCurrency, cadence:
                        monthly|biweekly|per_invoice, bankAccount?: {…} },
                      pendingPayoutPrefs?: same shape + submittedAt,
                      plan? }
workers             Set<workerId>
org:{id}:workers    Set<workerId>

invoice:{id}        { id, orgId, workerId, initiatedBy: company|worker,
                      amount, currency, memo, scheduledAt,
                      status, quoteRate, executedRate, usdcAmount,
                      rateMode: spread|fixed, feeBps, lockedRate?,
                      lockExpiresAt?, appliedRate?, feeUsdc?, lockExpired?,
                      payoutWalletId?, blockedReason?: kyc|plan,
                      txId, invoiceHash, runId,
                      payrollRunId?, error?, history: [{status, at, by}],
                      createdAt }
invoices            Set<invoiceId>
org:{id}:invoices   Set<invoiceId>
worker:{id}:invoices Set<invoiceId>

payrollrun:{id}     { id, orgId, invoiceIds[], status, createdAt }
tx:{id}             { id, hash, from, to, token: USDC|USDT, amount, blockNumber,
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

wallet:{id}         { id, owner: {type: org|worker, id}, label, address,
                      token: USDC|USDT, kind: platform|external,
                      status: active|revoked, isDefault, createdAt }
org:{id}:wallets    Set<walletId>
worker:{id}:wallets Set<walletId>

linkrequest:{id}    { id, orgId, workerId, kind: wallet|bank, message,
                      status: pending|accepted|declined, walletId?,
                      createdAt, resolvedAt? }
org:{id}:linkrequests     Set<linkRequestId>
worker:{id}:linkrequests  Set<linkRequestId>
```

`worker.memberships[]` holds one entry per organisation the worker has ever
belonged to: `{ orgId, status: active|offboarding|offboarded, joinedAt,
leftAt?, finalInvoiceId? }`. `worker.orgIds` is derived: the org ids whose
membership is `active` or `offboarding`. `org.walletAddress` is the address of
the org's default wallet (kept so existing settlement and explorer code keeps
working). `invoice.payoutWalletId` snapshots the worker wallet that was paid.

`org.plan` / `worker.plan` = `{ tier: free|pro|business, renewsAt,
sendsThisMonth }` is the sending account's subscription (§5.2 Plans). Accounts
without one are Free; a plan whose `renewsAt` has passed renews with
`sendsThisMonth = 0` the next time it is read. `invoice.blockedReason` (`kyc`
or `plan`) marks a `scheduled` invoice the settlement step refused to send
(§5.4).

### 4.1 Ontology

Every screen and action is expressed with these entities and nothing else:

```
User (company admin | individual)
 ├─ administers N Organizations            (company user; org switcher, §5.10)
 │    ├─ owns M Wallets                     (treasury + any extra, §5.12)
 │    ├─ has Memberships with Workers       (register / remove / offboard, §5.11)
 │    ├─ issues Invoices, runs PayrollRuns
 │    └─ sends LinkRequests to Workers      (ask for a wallet or bank account)
 └─ is a Worker (individual user)
      ├─ owns N Wallets (platform or external) + a BankAccount
      ├─ has KYC and PayoutPrefs (default payout wallet)
      ├─ approves / requests Invoices, makes Withdrawals
      └─ answers LinkRequests
Settlement pays the worker's default active wallet from the org's default
wallet and records the wallet id on the invoice and the memo on-chain.
```

Personas (§2) are users: Jordan is a company user administering Acme and
Nordwind, Mia administers Nordwind, every worker is an individual user.

Invoice status machine:

```
draft → pending_approval → scheduled → sending → confirmed
                 ↓                        ↓
              rejected                  failed  → (retry) scheduled
```

`sending` is also blocked (stays `scheduled`, flagged `blocked_kyc`) when the
worker's KYC status is not `verified`, and flagged `blocked_plan` when the
sending account's plan has no sends left this month (§5.2 Plans). Both flags
live in `invoice.blockedReason`; Retry clears either, an upgrade clears
`blocked_plan`.

## 5. Core flows

### 5.1 Scenario 1 — company invoice → worker approval → scheduled payout

1. Company admin opens "New invoice": worker, amount, currency (defaults to
   worker's local currency), scheduled time (default now + 2 min; the picker submits an ISO timestamp
   computed in the browser's timezone), memo.
2. Server Action stores the invoice as `pending_approval`, records
   `quoteRate` from the FX service and the pricing mode (§5.2), computes
   `invoiceHash = sha256(canonical JSON of {id, orgId, workerId, amount,
   currency, scheduledAt, memo, rateMode, lockedRate})`, creates a worker
   notification, and calls `scheduleInvoice(id)`.
3. Worker sees the invoice under "Needs your approval", reviews the
   details, and clicks Approve or Reject. Approve calls
   `resumeHook("approve:"+id, {approved:true})` (workflow) or sets status
   directly (tick). Company is notified.
4. At `scheduledAt` the scheduler runs settlement (§5.4).
5. Both parties see the status timeline advance in near real time.

### 5.2 Scenario 2 — currency-based amount, FX pricing: spread or fixed

- Invoices are denominated in the worker's local currency.
- `quoteRate` is captured at creation; `executedRate` is re-fetched
  immediately before sending (always the market rate, for the delta
  display). The rate the amount is computed with depends on the invoice's
  `rateMode`, chosen by the issuer (invoice form, payment request, or once
  per payroll run), default `spread`:
  - **spread** (변동형): `appliedRate = executedRate`, fee 0.5 % (50 bps).
    Cheapest; the final USDC amount is unknown until send.
  - **fixed** (고정형): `lockedRate = quoteRate` is frozen for 24 h after
    `scheduledAt` (`lockExpiresAt`); `appliedRate = lockedRate`, fee 1.1 %
    (110 bps, the risk premium). The USDC amount is known at issue. If the
    lock has expired at send time the invoice settles at market, `lockExpired`
    is set and the company is notified (`invoice_rate_lock_expired`).
- `usdcAmount = floor(amount / appliedRate, 6 dp)` for non-USD currencies
  (rates are per 1 USD) and is what the worker receives on-chain;
  `feeUsdc = floor(usdcAmount × feeBps / 10000, 6 dp)` is the company's
  cost, shown on the invoice. `rateMode` and `lockedRate` are part of the
  invoice hash (§5.6), so a locked rate is committed on-chain.
- Invoice detail shows quote rate, executed rate, delta (%) and the USDC
  amount, plus a small FX history sparkline.
- FX service: fetch from a keyless public API; on failure use hardcoded
  fallback rates and mark `source: fallback` (shown as a subtle badge).
  In simulated mode the service also applies a ±0.3 % random drift at
  send time so the quote/executed delta is visible in the demo.
- **Plans** (subscription on the sending account, `org.plan` /
  `worker.plan`): the sender pays a monthly fee — **Free** $0 with 3 sends
  per month, **Pro** $9 (individuals) and **Business** $99 (companies), both
  unlimited; receiving is always free. USDC transfers are included on paid
  tiers, so `feeUsdc` is `0` for spread and only the 0.6 % premium
  (110 − 50 bps) for fixed; Free pays the per-transfer fee above. The
  fixed-rate premium and the off-ramp fee (§5.7) stay per use on every tier.
  `sendsThisMonth` counts confirmed settlements and resets at `renewsAt`
  (start of the next month; an upgrade starts a 30-day period). Upgrading is
  a simulated card checkout on `/company/billing` (§6).

### 5.3 Scenario 3 — worker chooses payout conditions, company approves

- Worker "Payout settings": payout wallet (one of the worker's wallets,
  see §5.12), stablecoin (USDC default; USDT selectable — USDC is the
  compliance default, USDT is offered because many workers in SEA/LATAM
  prefer it), display currency, cadence (monthly / biweekly / per invoice),
  bank account for off-ramp.
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
if sender plan has no sends left → flag blocked_plan, notify company (invoice_blocked_plan), stop
status = sending
executedRate = fx.getRate(currency)                       // market
{ appliedRate, usdcAmount, feeUsdc, lockExpired } = price(invoice, executedRate)  // §5.2
feeUsdc = planFee(sender plan, rateMode, usdcAmount)      // §5.2 Plans: 0 on paid tiers for spread
if lockExpired → notify company (invoice_rate_lock_expired)
wallet = worker's default active Wallet (§5.12; legacy fallback: payoutPrefs)
tx = chain.transfer({ token: worker.payoutPrefs.stablecoin,
                      to: wallet.address, amount: usdcAmount,
                      memo: { invoiceId, invoiceHash } })
await chain.waitForConfirmation(tx)
status = confirmed, store txId, executedRate, usdcAmount, payoutWalletId
sender plan sendsThisMonth += 1 (notify company when Free's last send is used)
if this invoice is the worker's offboarding final settlement → membership
  offboarded (§5.11), notify both sides
notify worker ("You received …") and company ("Settled …")
on error → status = failed, store error, notify company
```

Retry from the invoice detail page clears any blocked flag and re-runs the
settlement step; an upgrade (§5.2 Plans) does the same for every invoice the
plan limit was holding.

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
the stored invoice, and shows "Verified" or "Mismatch". Retry never
rewrites hashed fields (`scheduledAt` stays as issued), so a retried
invoice still verifies. Links to the
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
approved, rejected, scheduled, settled, failed, blocked; plan limit reached,
plan upgraded; payout prefs
submitted/approved; withdrawal completed; KYC verified; worker invited,
offboarded; wallet added; link request sent/accepted/declined; rate lock
expired. Each notification
links to the relevant page. Actions that would send email show an
"Email sent to …" toast.

### 5.10 Multi-org

Company admin A can switch orgs via a header menu (Acme ↔ Nordwind).
Switching changes the active `orgId` in the session cookie; all company
pages are scoped by it. Alice appears in both orgs with separate invoice
histories.

### 5.11 Worker lifecycle

- **Register**: company "Add worker" (name, email, country, local currency,
  stablecoin). Creates the worker with `kyc.status = pending`, a platform
  wallet, an `active` membership, and an invitation notification ("Email
  sent" toast). The worker appears in the list with a KYC badge.
- **Remove**: detaches the membership (`status = offboarded`, `leftAt = now`)
  without a final payment. Refused while the worker has an open invoice
  (`pending_approval`, `scheduled`, `sending`) in that org.
- **Offboard** (퇴사 처리): optional final invoice (amount prefilled from the
  last confirmed one, `scheduledAt = now`, pre-approved like payroll), then
  membership `offboarding` → `offboarded` once that invoice confirms (the
  settlement step flips it). New invoices and payroll rows are blocked for
  offboarded memberships; history stays visible under "Former workers" and
  on the worker's own home ("Offboarded from Acme Remote on …").

### 5.12 Wallets

- An org has M wallets (`/company/wallets`): every org the user administers
  is listed with its wallets, balance per wallet, this-month volume and the
  default marker. "Add wallet" takes a label and an address or creates a
  platform wallet; "Make default" changes where settlements are paid from.
- A worker has N wallets (`/worker/settings`): list, add (platform or
  external), set the payout wallet (goes through the pending-prefs approval
  of §5.3). Settlement always pays the default active wallet and stores
  `payoutWalletId` on the invoice.
- **Link requests**: from a worker profile the company asks for a wallet or
  a bank account (`kind`, message). The worker sees it in Settings and
  accepts by adding the wallet/bank (request → `accepted`, wallet id
  attached) or declines. Both sides are notified.

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
- `/company/workers` — active workers with KYC, payout type, settlement
  count, "Add worker" form, and a "Former workers" section;
  `/company/workers/[id]` — worker profile, wallets, payout prefs, history,
  "Request wallet/bank link", "Offboard" (with optional final invoice) and
  "Remove".
- `/company/wallets` — every org the user administers × its wallets
  (balance, default, add wallet, make default).
- `/company/approvals` — pending payout-pref changes and worker-initiated
  invoices.
- `/company/billing` — current plan, sends this month, held payouts, what
  per-transfer billing would have cost, upgrade (simulated checkout) which
  releases held payouts.
- `/worker` — balance (USDC + local equivalent), "Needs your approval",
  recent settlements, withdraw CTA, KYC banner if not verified.
- `/worker/invoices/[id]` — same detail as company view, worker actions.
- `/worker/request` — worker-initiated invoice form.
- `/worker/withdraw` — off-ramp simulation.
- `/worker/settings` — wallets (list, add, payout wallet), link requests
  inbox, payout settings (currency, cadence, bank).
- `/worker/onboarding` — KYC wizard.
- `/explorer/tx/[hash]` — in-app explorer page for simulated transactions
  (hash, block, from/to, amount, gas, decoded calldata with the Settlivo
  memo).
- `/notifications` — full list for the current persona.
- `POST /api/invoices/[id]/approve` — approval endpoint (also the Next.js
  entrypoint that makes the Workflow builder discover `invoiceWorkflow`).
- `GET /api/tick` — polled by the client every 3 s: settles the oldest due
  invoice (one per call, so a batch confirms row by row) in `tick` mode and
  completes withdrawals older than 8 s.

Worker routes are responsive down to 375 px. Company routes target desktop
but must not break on tablet widths.

## 7. Seed data

A `seed` script (idempotent, `FLUSH` optional) populates:

- 2 orgs, 5 workers, memberships as in §2, plus one former Nordwind worker
  (offboarded) so the lifecycle is visible.
- Plans (§5.2): Acme is Business; Nordwind is Free with its 3 sends for the
  month already used, so its next send holds until an upgrade; individuals
  are Free.
- Wallets: two per org (treasury + operations) and two for Alice (platform
  + external); one pending link request from Acme to Bob.
- ~24 historical invoices across the last 3 months (mixed statuses, mostly
  confirmed) with matching tx records and FX history.
- 2 past payroll runs.
- 3 withdrawals (completed).
- ~15 notifications per persona, some unread.
- FX history for the last 30 days (synthetic with mild noise).

Demo reset: the "Reset demo data" button on `/login` (asks for the
`SEED_SECRET` when one is configured) and the equivalent `POST /api/seed`
route re-seed in one call so the presenter can restore state between
rehearsals.

## 8. Error handling and fallbacks

- Settlement failure → `failed` with reason; detail page offers Retry.
- Fixed-rate lock expired at send → settles at market, `lockExpired`,
  company notified; the fee stays at the fixed-mode rate chosen at issue.
- Any uncaught Server Action error → `app/error.tsx` ("That didn't go
  through", Try again / Go back) instead of a blank screen.
- Cached `fx:rates` are refreshed from the live API when they are missing,
  seeded as fallback, or older than 10 minutes, so a reseed does not pin
  the demo to synthetic rates.
- FX fetch failure → fallback rates, `source: fallback` badge.
- Workflow unavailable → switch `SCHEDULER=tick`; no code change. Even in
  `workflow` mode, `/api/tick` (polled by every open page) settles invoices
  that are more than 45 s overdue, so a stalled run cannot strand the demo.
- Approval when the run has not registered its hook yet → `resumeHook` is
  retried briefly, then a fresh run is started that takes the `scheduled`
  branch.
- Testnet unavailable → `CHAIN_MODE=simulated` (default anyway).
- Redis unavailable → app shows a single "service unavailable" page;
  no silent fallbacks.
- KYC not verified at send time → invoice stays `scheduled` with a
  `blocked_kyc` flag and company notification; verifying the worker and
  pressing Retry sends it.
- Plan limit at send time → invoice stays `scheduled` with `blocked_plan`;
  upgrading releases it, Retry also works once the month renews.

## 9. Testing

Unit tests (Vitest) for pure modules only:

- calldata memo encode/decode round trip and hash verification;
- FX conversion and 6-dp floor, fallback selection;
- invoice status transitions (valid/invalid moves, KYC block);
- plan limits, renewal and plan-adjusted fees (§5.2 Plans).

Manual end-to-end rehearsal script (kept in `docs/demo-script.md`):
login as company → create invoice for Alice (now + 2 min) → login as Alice
→ approve → watch settlement → open on-chain record → withdraw to KRW →
back to company → run payroll for 3 workers → approve Bob's wallet change
→ switch to Nordwind → show Alice's second history → back to Acme: register
a worker, review wallets, offboard Bob → Alice adds a wallet (§4.1, §5.11,
§5.12) → Nordwind's Free limit holds a payroll run, upgrading to Business
releases it (§5.2 Plans).

Workflow integration tests are skipped for time; the `tick` engine is the
tested path if Workflow misbehaves.

## 10. Configuration

```
KV_REST_API_URL / KV_REST_API_TOKEN   (Upstash integration; UPSTASH_REDIS_REST_* accepted)
KV_MODE=auto|file|upstash          default auto (file when no credentials)
SCHEDULER=workflow|tick            default workflow
CHAIN_MODE=simulated|testnet       default simulated
SEED_SECRET                        protects /api/seed
# testnet only
BASE_SEPOLIA_RPC_URL
PLATFORM_PRIVATE_KEY
USDC_ADDRESS                        Base Sepolia USDC
FX_API_URL                          optional override
SIM_CONFIRM_MS                      simulated only, confirmation delay ms
DEMO_TIMEZONE                       IANA zone for server-rendered times (default Asia/Seoul;
                                    Vercel functions run in UTC)
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
