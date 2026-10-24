# Settlivo Demo MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed, fully simulated Settlivo demo (company ↔ worker stablecoin payroll with invoices, scheduled settlement, FX, payout approvals, payroll runs, off-ramp, KYC, notifications, multi-org) by 15:00 KST today.

**Architecture:** One Next.js App Router app on Vercel. Upstash Redis holds JSON documents; a `ChainAdapter` (simulated by default, Base Sepolia optional) produces transactions with an invoice memo in calldata; settlement runs behind a `scheduleInvoice` interface implemented by Vercel Workflow or a polled `/api/tick` route. Server Actions write, pages poll every 3 s.

**Tech Stack:** Next.js (latest, TypeScript, Tailwind, src dir), shadcn/ui, `@upstash/redis`, `workflow` + `@workflow/next`, `viem`, `zod`, `swr`, `vitest`, `nanoid`.

**Spec:** `docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md`

## Global Constraints

- Deadline 15:00 KST 2026-10-24; when a task overruns, cut polish, never the demo flow in spec §9.
- `CHAIN_MODE` defaults to `simulated`; `SCHEDULER` defaults to `workflow`; both read at call time, never at module top level.
- No Redis/env access at module top level (build-time safety); use lazy `getRedis()`.
- English UI copy; dark fintech theme; worker routes usable at 375 px.
- USDC amounts are 6-decimal strings; never floats in storage.
- IDs: `org_`, `wrk_`, `inv_`, `tx_`, `run_`, `wd_`, `ntf_` + nanoid(8).
- Every write goes through `src/lib/db/repo.ts`; pages never touch Redis directly.
- Commit after every task; push to `main` deploys production.

## Review Focus

1. `scheduledAt` already in the past at approval time → settles immediately, not never. (Task 5 test `computeDelayMs` returns 0.)
2. Worker changes active wallet between invoice creation and settlement → settlement pays the wallet active at send time. (Task 5 test.)
3. Worker KYC not verified at send time → invoice stays `scheduled` with `blockedReason: "kyc"`, never `failed`; Retry after verification settles. (Task 5 test.)
4. Double-click Approve → second call is a no-op, no second transfer. (Task 2 transition test: `scheduled → scheduled` invalid; Task 5 approve is idempotent.)
5. Calldata with no Settlivo suffix (plain transfer) → `decodeMemo` returns `null`, does not throw. (Task 4 test.)

---

### Task 1: Toolchain, scaffold, Vercel link, first deploy

**Files:**
- Create: Next.js app at repo root (`src/app`, `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind` config via create-next-app)
- Create: `vitest.config.ts`, `.env.example`, `.gitignore` additions (`.env*.local`, `.vercel`)
- Modify: `README.md` (add "Run locally" section)

**Interfaces:**
- Produces: `npm run dev`, `npm test` (vitest), `npm run build`; env vars from Upstash in `.env.local`.

- [ ] **Step 1: Install Node and Vercel CLI**

Run: `brew install node && npm i -g vercel`
Expected: `node -v` prints v22+ ; `vercel --version` prints a version.

- [ ] **Step 2: Scaffold Next.js into the existing repo**

Run from `/Users/phil/Ws/Settlivo`:
`npx -y create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes`
(if it refuses a non-empty dir, scaffold into `/tmp/settlivo-scaffold` and `rsync -a --exclude .git /tmp/settlivo-scaffold/ ./`).
Expected: `src/app/page.tsx` exists; `npm run build` succeeds.

- [ ] **Step 3: Add dependencies**

Run: `npm i @upstash/redis workflow @workflow/next viem zod swr nanoid date-fns sonner lucide-react && npm i -D vitest @vitejs/plugin-react tsx dotenv-cli`
Then `npx shadcn@latest init -d` and `npx shadcn@latest add button card badge table dialog input select tabs label textarea separator skeleton switch`.

- [ ] **Step 4: Configure vitest and workflow**

`vitest.config.ts`: `test: { include: ["src/**/*.test.ts"], environment: "node" }`, alias `@` → `src`.
`next.config.ts`: wrap config with `withWorkflow` from `workflow/next`.
`package.json` scripts: `"test": "vitest run"`, `"seed": "dotenv -e .env.local -- tsx scripts/seed.ts"`.

- [ ] **Step 5: Smoke test**

Create `src/lib/smoke.test.ts` asserting `1 + 1 === 2`. Run `npm test`. Expected: 1 passed. Delete the file afterwards or keep as placeholder until Task 2 adds real tests.

- [ ] **Step 6: Vercel link, Upstash, env**

Ask the user to run `! vercel login` if `vercel whoami` fails.
Run: `vercel link --yes` (new project `settlivo`), then `vercel integration add upstash` (choose Redis, free plan), then `vercel env pull .env.local --yes`.
Expected: `.env.local` contains `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
Add `SEED_SECRET`, `CHAIN_MODE=simulated`, `SCHEDULER=workflow` via `vercel env add` for production and preview, and to `.env.local`.

- [ ] **Step 7: Commit and deploy**

```bash
git add -A && git commit -m "chore: scaffold Next.js app, vitest, shadcn, Vercel + Upstash"
vercel --prod --yes
```
Expected: production URL returns the default page with HTTP 200.

---

### Task 2: Domain types, status machine, Redis repository

**Files:**
- Create: `src/lib/domain/types.ts`, `src/lib/domain/ids.ts`, `src/lib/domain/invoice-status.ts`
- Create: `src/lib/db/redis.ts`, `src/lib/db/repo.ts`
- Test: `src/lib/domain/invoice-status.test.ts`

**Interfaces:**
- Produces types mirroring spec §4: `Org`, `Worker`, `KycStatus`, `PayoutPrefs`, `Invoice`, `InvoiceStatus`, `PayrollRun`, `Tx`, `Withdrawal`, `Notification`, `FxRates`.
- Produces `newId(prefix: "org"|"wrk"|"inv"|"tx"|"run"|"wd"|"ntf"): string`.
- Produces `canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean` and `transition(inv: Invoice, to: InvoiceStatus, by: string, extra?: Partial<Invoice>): Invoice` (throws `InvalidTransitionError`; appends to `history`).
- Produces `getRedis(): Redis` (lazy singleton via `Redis.fromEnv()`).
- Produces repo functions (all async, all take/return domain types):
  `getOrg, listOrgs, putOrg, getWorker, listWorkers, listWorkersByOrg, putWorker, getInvoice, listInvoicesByOrg, listInvoicesByWorker, listAllInvoices, putInvoice, getPayrollRun, putPayrollRun, getTx, getTxByHash, putTx, getWithdrawal, listWithdrawalsByWorker, putWithdrawal, pushNotification, listNotifications(recipient, limit), markNotificationsRead(recipient), getFxRates, putFxRates, pushFxHistory, listFxHistory(limit), flushAll()`.
- `Invoice` gains `blockedReason?: "kyc"` (spec §4 `blocked_kyc` flag) and `stablecoin: "USDC"|"USDT"` snapshot at creation.

- [ ] **Step 1: Write failing status tests**

```ts
import { canTransition, transition } from "./invoice-status";
test("valid path", () => {
  expect(canTransition("pending_approval", "scheduled")).toBe(true);
  expect(canTransition("scheduled", "sending")).toBe(true);
  expect(canTransition("sending", "confirmed")).toBe(true);
  expect(canTransition("sending", "failed")).toBe(true);
  expect(canTransition("failed", "scheduled")).toBe(true);
  expect(canTransition("pending_approval", "rejected")).toBe(true);
});
test("invalid moves", () => {
  expect(canTransition("scheduled", "scheduled")).toBe(false);
  expect(canTransition("confirmed", "sending")).toBe(false);
  expect(canTransition("rejected", "scheduled")).toBe(false);
});
test("transition appends history", () => {
  const inv = { status: "pending_approval", history: [] } as any;
  const next = transition(inv, "scheduled", "worker:wrk_a");
  expect(next.status).toBe("scheduled");
  expect(next.history.at(-1)).toMatchObject({ status: "scheduled", by: "worker:wrk_a" });
  expect(() => transition(next, "confirmed", "x")).toThrow();
});
```

- [ ] **Step 2: Run** `npm test` → FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts`, `ids.ts`, `invoice-status.ts` (transition table as a `Record<InvoiceStatus, InvoiceStatus[]>`).
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Implement** `redis.ts` and `repo.ts`. Keys exactly as spec §4. Lists: notifications use `LPUSH` + `LRANGE`; FX history uses `LPUSH` + `LTRIM 0 999`. `listInvoicesByOrg` sorts by `createdAt` desc in code.
- [ ] **Step 6: Typecheck** `npx tsc --noEmit` → no errors.
- [ ] **Step 7: Commit** `feat: domain types, invoice status machine, redis repo`

---

### Task 3: FX service

**Files:**
- Create: `src/lib/fx/rates.ts`, `src/lib/fx/convert.ts`, `src/lib/fx/fallback.ts`
- Test: `src/lib/fx/convert.test.ts`, `src/lib/fx/rates.test.ts`

**Interfaces:**
- Produces `SUPPORTED_CURRENCIES = ["USD","KRW","PHP","BRL","PLN","VND","EUR"] as const`, `Currency` type.
- Produces `FALLBACK_RATES: Record<Currency, number>` (per 1 USD; USD = 1).
- Produces `getRates(opts?: { fetchImpl?: typeof fetch; drift?: boolean }): Promise<FxRates>` — fetches `${process.env.FX_API_URL ?? "https://open.er-api.com/v6/latest/USD"}`, picks supported currencies, `source: "live"`; on any error returns fallback with `source: "fallback"`. When `drift` is true (simulated send-time), multiplies each non-USD rate by `1 + random(-0.003, 0.003)`. Caches via `putFxRates`/`pushFxHistory` when called from settlement (caller's responsibility, not inside).
- Produces `toUsdc(amount: number, currency: Currency, rates: FxRates): string` — `floor(amount / rate, 6)` as a 6-dp string; USD passes through.
- Produces `fromUsdc(usdc: string, currency: Currency, rates: FxRates): number`.

- [ ] **Step 1: Write failing tests**

```ts
test("toUsdc floors to 6 dp", () => {
  const rates = { base: "USD", rates: { ...FALLBACK_RATES, KRW: 1380 }, fetchedAt: "", source: "fallback" } as FxRates;
  expect(toUsdc(3_000_000, "KRW", rates)).toBe("2173.913043");
  expect(toUsdc(100, "USD", rates)).toBe("100.000000");
});
test("getRates falls back on fetch error", async () => {
  const r = await getRates({ fetchImpl: async () => { throw new Error("down"); } });
  expect(r.source).toBe("fallback");
  expect(r.rates.KRW).toBe(FALLBACK_RATES.KRW);
});
test("getRates parses live payload", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ result: "success", rates: { KRW: 1400, PHP: 58, BRL: 5.1, PLN: 4, VND: 25000, EUR: 0.92, USD: 1, JPY: 150 } }));
  const r = await getRates({ fetchImpl });
  expect(r.source).toBe("live");
  expect(r.rates.KRW).toBe(1400);
  expect((r.rates as any).JPY).toBeUndefined();
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the three files. Use integer math for floor: `Math.floor(amount / rate * 1e6) / 1e6` then `toFixed(6)`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: fx rates with fallback and usdc conversion`

---

### Task 4: Memo codec and chain adapters

**Files:**
- Create: `src/lib/chain/memo.ts`, `src/lib/chain/types.ts`, `src/lib/chain/simulated.ts`, `src/lib/chain/testnet.ts`, `src/lib/chain/index.ts`
- Test: `src/lib/chain/memo.test.ts`, `src/lib/chain/simulated.test.ts`

**Interfaces:**
- Produces `invoiceHash(inv: Pick<Invoice,"id"|"orgId"|"workerId"|"amount"|"currency"|"scheduledAt"|"memo">): string` — sha256 hex of canonical JSON with keys in that order (Node `crypto`).
- Produces `encodeMemo(m: { invoiceId: string; invoiceHash: string }): \`0x${string}\`` — UTF-8 bytes of `SETTLIVO|{invoiceId}|{invoiceHash}` as hex; `decodeMemo(calldata: \`0x${string}\`): { invoiceId; invoiceHash } | null` — scans for the `SETTLIVO|` marker after the first 68 bytes (136 hex chars + `0x`).
- Produces `buildTransferCalldata(to: Address, amountUnits: bigint, memo): \`0x${string}\`` = viem `encodeFunctionData(erc20 transfer)` + memo hex.
- Produces `interface ChainAdapter { transfer(req: { token: "USDC"|"USDT"; to: string; amount: string; memo: { invoiceId: string; invoiceHash: string } }): Promise<Tx>; waitForConfirmation(txId: string): Promise<Tx>; getBalance(address: string, token: "USDC"|"USDT"): Promise<string>; explorerUrl(hash: string): string; }`
- Produces `getChain(): ChainAdapter` choosing by `process.env.CHAIN_MODE` at call time.
- Simulated adapter: hash = `0x` + 64 random hex; `blockNumber` monotonic from `INCR sim:block` starting at 21_400_000; `gasUsed` 51_000–65_000; `status: pending` on create, `confirmed` after 2–5 s via `waitForConfirmation` (which sleeps then updates); `explorerUrl` = `/explorer/tx/{hash}`; balances kept in `sim:balance:{address}:{token}` (string, 6 dp) and debited/credited on confirm; `from` = `0x5e77...` constant `PLATFORM_SIM_ADDRESS`.
- Testnet adapter: viem `createWalletClient` with `privateKeyToAccount(PLATFORM_PRIVATE_KEY)`, chain `baseSepolia`, `sendTransaction({ to: USDC_ADDRESS, data: buildTransferCalldata(...) })`, `waitForTransactionReceipt`; `explorerUrl` = `https://sepolia.basescan.org/tx/{hash}`; USDT → throws `FatalError("USDT not available on testnet")`.

- [ ] **Step 1: Write failing memo tests**

```ts
test("memo round trip", () => {
  const data = buildTransferCalldata("0x000000000000000000000000000000000000dEaD", 1_000_000n, { invoiceId: "inv_abc12345", invoiceHash: "ab".repeat(32) });
  expect(data.startsWith("0xa9059cbb")).toBe(true);
  expect(decodeMemo(data)).toEqual({ invoiceId: "inv_abc12345", invoiceHash: "ab".repeat(32) });
});
test("plain transfer has no memo", () => {
  const plain = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: ["0x000000000000000000000000000000000000dEaD", 1n] });
  expect(decodeMemo(plain)).toBeNull();
});
test("invoiceHash is stable and order-insensitive", () => {
  const a = invoiceHash({ id: "inv_1", orgId: "org_1", workerId: "wrk_1", amount: 100, currency: "USD", scheduledAt: "2026-10-24T05:00:00.000Z", memo: "Oct" });
  const b = invoiceHash({ memo: "Oct", scheduledAt: "2026-10-24T05:00:00.000Z", currency: "USD", amount: 100, workerId: "wrk_1", orgId: "org_1", id: "inv_1" });
  expect(a).toBe(b); expect(a).toMatch(/^[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `memo.ts`. **Step 4: Run** → PASS.
- [ ] **Step 5: Write simulated adapter test** (uses an in-memory fake of the repo via `vi.mock("@/lib/db/repo")` and `vi.mock("@/lib/db/redis")`): `transfer` returns `status: "pending"` with 66-char hash and calldata whose `decodeMemo` matches; `waitForConfirmation` with `process.env.SIM_CONFIRM_MS="10"` returns `status: "confirmed"` and `blockNumber > 0`.
- [ ] **Step 6: Implement** `types.ts`, `simulated.ts`, `index.ts`; then `testnet.ts` (no test; compile only).
- [ ] **Step 7: Run** `npm test && npx tsc --noEmit` → PASS.
- [ ] **Step 8: Commit** `feat: invoice memo codec, simulated and testnet chain adapters`

---

### Task 5: Settlement, scheduler (workflow + tick), approvals

**Files:**
- Create: `src/lib/settlement/settle.ts`, `src/lib/settlement/notify.ts`
- Create: `src/lib/scheduler/index.ts`, `src/lib/scheduler/delay.ts`
- Create: `src/workflows/invoice.ts`
- Create: `src/app/api/tick/route.ts`, `src/app/api/invoices/[id]/approve/route.ts` (optional; Server Actions may call `approveInvoice` directly — keep the route for curl testing)
- Test: `src/lib/settlement/settle.test.ts`, `src/lib/scheduler/delay.test.ts`

**Interfaces:**
- Consumes `getChain()`, `getRates()`, `toUsdc()`, repo, `transition()`.
- Produces `notify(recipient: {type:"org"|"worker"; id:string}, kind: NotificationKind, title: string, body: string, href: string): Promise<void>`.
- Produces `settleInvoice(invoiceId: string): Promise<Invoice>` implementing spec §5.4 exactly: KYC gate → `blockedReason="kyc"` + org notification, return; else `sending` → rates (`drift: true` when `CHAIN_MODE=simulated`) → `putFxRates` + `pushFxHistory` → `chain.transfer` to `worker.payoutPrefs.wallet === "external" ? externalAddress : platformWallet`, token `worker.payoutPrefs.stablecoin` → `waitForConfirmation` → `confirmed` with `txId, executedRate, usdcAmount` → notifications; on throw → `failed` with `error`.
- Produces `computeDelayMs(scheduledAt: string, now?: Date): number` (≥ 0).
- Produces `scheduleInvoice(invoiceId: string): Promise<void>` — `SCHEDULER=workflow`: `start(invoiceWorkflow, [invoiceId])` and store `runId`; `tick`: no-op (tick route finds it).
- Produces `approveInvoice(invoiceId: string, by: string, approved: boolean, reason?: string): Promise<Invoice>` — idempotent: if status is not `pending_approval`, return unchanged. Approved → `transition(..., "scheduled")`; rejected → `rejected`. Then `SCHEDULER=workflow`: `resumeHook("approve:"+id, { approved })`; `tick`: nothing.
- Produces `retryInvoice(invoiceId: string): Promise<void>` — `failed` → `scheduled` (or clears `blockedReason`) and re-schedules with `scheduledAt = now`.
- Workflow `invoiceWorkflow(invoiceId)`: `"use workflow"`; `const { approved } = await createHook<{approved:boolean}>({ token: "approve:"+invoiceId })` unless the invoice is already `scheduled` (payroll/pre-approved — check via a step `loadStatus`); if rejected return; `await sleep(await computeDelayStep(invoiceId))` (check `sleep` argument type in `node_modules/workflow/docs/api-reference/workflow/sleep.mdx`; pass `"{n}ms"` or ms number as documented); `await settleStep(invoiceId)` (`"use step"` wrapper around `settleInvoice`).
- Tick route `GET /api/tick`: lists invoices with `status==="scheduled" && !blockedReason && scheduledAt <= now`, settles sequentially, returns `{ settled: string[] }`. Also auto-completes withdrawals older than 8 s (`processing` → `completed`) so Task 9 needs no extra timer.

- [ ] **Step 1: Write failing tests** (mock repo/chain/fx with `vi.mock`):

```ts
test("computeDelayMs clamps past dates to 0", () => {
  expect(computeDelayMs("2026-10-24T00:00:00Z", new Date("2026-10-24T01:00:00Z"))).toBe(0);
  expect(computeDelayMs("2026-10-24T01:00:30Z", new Date("2026-10-24T01:00:00Z"))).toBe(30_000);
});
test("settle blocks on unverified KYC", async () => { /* worker.kyc.status="pending" */ 
  const inv = await settleInvoice("inv_1");
  expect(inv.status).toBe("scheduled"); expect(inv.blockedReason).toBe("kyc");
  expect(chain.transfer).not.toHaveBeenCalled();
});
test("settle pays the wallet active at send time", async () => { /* prefs.wallet="external", externalAddress="0xEXT" */
  await settleInvoice("inv_1");
  expect(chain.transfer).toHaveBeenCalledWith(expect.objectContaining({ to: "0xEXT", token: "USDT" }));
});
test("settle records executedRate and usdcAmount and confirms", async () => {
  const inv = await settleInvoice("inv_1"); // amount 3_000_000 KRW, rate 1380
  expect(inv.status).toBe("confirmed"); expect(inv.usdcAmount).toBe("2173.913043"); expect(inv.txId).toBeTruthy();
});
test("settle marks failed on chain error", async () => { /* chain.transfer rejects */
  const inv = await settleInvoice("inv_1"); expect(inv.status).toBe("failed"); expect(inv.error).toMatch(/rpc/i);
});
test("approveInvoice is idempotent", async () => { /* invoice already scheduled */
  const inv = await approveInvoice("inv_1", "worker:wrk_1", true);
  expect(inv.status).toBe("scheduled"); expect(resumeHook).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `delay.ts`, `notify.ts`, `settle.ts`, `scheduler/index.ts`. **Step 4: Run** → PASS.
- [ ] **Step 5: Implement** `src/workflows/invoice.ts` and `/api/tick`. Verify `sleep` signature from bundled docs before writing.
- [ ] **Step 6: Local check** `npm run dev` and `npx workflow health` → endpoints reachable. If Workflow fails locally after 10 minutes of effort, set `SCHEDULER=tick` and move on.
- [ ] **Step 7: Commit** `feat: settlement, workflow and tick schedulers, invoice approval`

---

### Task 6: Seed data and reset endpoint

**Files:**
- Create: `src/lib/seed/personas.ts`, `src/lib/seed/generate.ts`, `src/lib/seed/index.ts`
- Create: `src/app/api/seed/route.ts`, `scripts/seed.ts`

**Interfaces:**
- Produces `PERSONAS` constant (spec §2): orgs `org_acme`, `org_nordwind`; workers `wrk_alice`, `wrk_bob`, `wrk_carlos`, `wrk_dana`, `wrk_eun`; company admins map to org IDs. Fixed IDs so links in notifications and the demo script are stable.
- Produces `seedAll({ flush: boolean }): Promise<{ counts: Record<string, number> }>` creating everything in spec §7 with deterministic pseudo-random (seeded PRNG) so reseeds look identical. Historical invoices get `confirmed` txs through the simulated adapter's storage format (write `tx:*` directly via repo, not through `transfer`). Simulated balances: Acme 48_250 USDC, Nordwind 21_900 USDC, each worker 300–2_400 USDC.
- `POST /api/seed` requires header `x-seed-secret === process.env.SEED_SECRET`; body `{ flush?: boolean }`.
- `scripts/seed.ts` calls `seedAll({ flush: true })` against `.env.local`.

- [ ] **Step 1: Implement** the files (no unit test; verify by running).
- [ ] **Step 2: Run** `npm run seed` → prints counts; `orgs:2 workers:5 invoices:≈24 payrollRuns:2 withdrawals:3`.
- [ ] **Step 3: Spot check** `curl -s "$UPSTASH_REDIS_REST_URL/get/worker:wrk_eun" -H "Authorization: Bearer $TOKEN"` → `kyc.status` is `pending`.
- [ ] **Step 4: Commit** `feat: deterministic demo seed and reset endpoint`

---

### Task 7: Session, login, app shell, polling

**Files:**
- Create: `src/lib/session.ts` (cookie `settlivo_session` = JSON `{ role: "company"|"worker"; orgId?: string; workerId?: string; adminName: string }`), `src/lib/actions/session.ts`
- Create: `src/app/login/page.tsx`, `src/app/(company)/layout.tsx`, `src/app/(worker)/layout.tsx`, `src/components/shell/{header,nav,org-switcher,notification-bell,persona-badge}.tsx`, `src/components/ui/status-badge.tsx`, `src/components/ui/money.tsx`
- Create: `src/hooks/use-poll.ts` (`useEffect` + `setInterval(router.refresh, 3000)` while tab visible)
- Modify: `src/app/page.tsx` → redirect to `/login` or role home; `src/app/globals.css` dark palette; `src/proxy.ts` (or `middleware.ts` per installed Next.js version) redirecting unauthenticated `/company/*` and `/worker/*` to `/login`.

**Interfaces:**
- Produces `getSession(): Promise<Session | null>`, `requireCompany(): Promise<Session & { orgId: string }>`, `requireWorker(): Promise<Session & { workerId: string }>`; actions `loginAs(persona: PersonaId)`, `switchOrg(orgId)`, `logout()`.
- Produces `<StatusBadge status={InvoiceStatus | "blocked"} />` with fixed colors; `<Money amount currency />` and `<Usdc value />` formatters.
- Produces `<NotificationBell />` showing unread count (polls with the page) and a dropdown of the latest 8 with links; opening marks read.

- [ ] **Step 1: Implement** session + login page listing the five worker personas and two company admins as cards (name, role, org, flag emoji); "Sign in with Google" button scrolls to the picker.
- [ ] **Step 2: Implement** layouts and shell. Company nav: Dashboard, Invoices, Payroll, Workers, Approvals. Worker nav: Home, Request payment, Withdraw, Settings. Both: bell, persona badge, logout. Company header has `<OrgSwitcher />` when the admin belongs to more than one org (Admin A → both orgs).
- [ ] **Step 3: Verify** manually: login as each persona lands on the right home with empty-state placeholders; org switch changes header; unauthenticated `/company` redirects.
- [ ] **Step 4: Commit** `feat: persona login, role layouts, shell with notifications and org switcher`

---

### Task 8: Company screens

**Files:**
- Create: `src/lib/actions/invoices.ts`, `src/lib/actions/payroll.ts`, `src/lib/actions/approvals.ts`
- Create: `src/app/(company)/company/page.tsx`, `.../company/invoices/page.tsx`, `.../company/invoices/new/page.tsx`, `.../company/invoices/[id]/page.tsx`, `.../company/payroll/page.tsx`, `.../company/payroll/[runId]/page.tsx`, `.../company/workers/[id]/page.tsx`, `.../company/approvals/page.tsx`
- Create: `src/components/invoices/{invoice-table,invoice-form,invoice-timeline,fx-comparison,onchain-record}.tsx`, `src/components/dashboard/{savings-widget,stat-card}.tsx`, `src/components/payroll/{run-builder,run-progress}.tsx`, `src/components/approvals/prefs-diff.tsx`

**Interfaces:**
- Produces actions: `createInvoice(form: { workerId; amount; currency; scheduledAt; memo })` (company-initiated; spec §5.1 steps 2), `approveWorkerInvoice(id, approved, reason?)`, `retryInvoiceAction(id)`, `createPayrollRun(items: {workerId; amount; currency}[])` (spec §5.5: invoices pre-`scheduled`, `scheduledAt=now`, `payrollRunId`, then `scheduleInvoice` each), `approvePayoutPrefs(workerId, approved, reason?)`.
- `<InvoiceTimeline history />` renders the status history with timestamps; `<FxComparison invoice />` shows quote, executed, delta %, USDC amount, and a 30-point sparkline from `listFxHistory`; `<OnchainRecord invoice tx />` decodes memo, recomputes `invoiceHash`, shows Verified/Mismatch, link to `chain.explorerUrl(hash)`.
- Savings widget: for confirmed invoices this month, bank-wire baseline = `$35 + 2.2%` and 4 days; Settlivo = `0.5%` and ~10 minutes; show money and days saved.
- Payroll run page: `<RunProgress runId />` polls and renders each invoice's status as a step list; the server settles them sequentially via the scheduler (simulated confirmations arrive ~1–3 s apart, which reads as "sequential").

- [ ] **Step 1: Implement** actions.
- [ ] **Step 2: Implement** dashboard, invoices list, new-invoice form (worker select pre-fills currency; datetime default now+2 min; shows live quote rate from `getRates`).
- [ ] **Step 3: Implement** invoice detail, approvals page, worker profile page, payroll builder and run page.
- [ ] **Step 4: Verify** spec §9 company half manually against seeded data: create invoice for Alice, see it in Alice's approvals (Task 9 after), run payroll for 3 workers and watch it confirm, approve a pending prefs change.
- [ ] **Step 5: Commit** `feat: company dashboard, invoices, payroll runs, approvals`

---

### Task 9: Worker screens (approval, request, withdraw, settings, KYC)

**Files:**
- Create: `src/lib/actions/worker.ts`
- Create: `src/app/(worker)/worker/page.tsx`, `.../worker/invoices/[id]/page.tsx`, `.../worker/request/page.tsx`, `.../worker/withdraw/page.tsx`, `.../worker/settings/page.tsx`, `.../worker/onboarding/page.tsx`
- Create: `src/components/worker/{approval-card,withdraw-form,withdraw-list,payout-settings-form,kyc-wizard,kyc-banner,balance-card}.tsx`

**Interfaces:**
- Produces actions: `approveMyInvoice(id, approved, reason?)` → `approveInvoice`; `requestPayment(form)` → invoice `initiatedBy: "worker"`, `pending_approval`, notifies org; `submitPayoutPrefs(prefs)` → `pendingPayoutPrefs`, notifies each org; `createWithdrawal({ usdcAmount, currency })` → spec §5.7 (fee 0.5 %, rate from `getFxRates` or `getRates`, ETA "~10 minutes", `status: processing`, debit `sim:balance`); `completeKycStep(step)` and `finishKyc()` → `status: verified` after a 3 s client-side "Reviewing…" then server write.
- Withdraw page shows bank-wire comparison row: 3–5 business days, `$25–45 + 1.5–3 % FX spread`.
- Balance card: USDC balance from `getChain().getBalance(activeWallet, stablecoin)` plus local-currency equivalent.
- KYC banner appears on `/worker` when not verified and links to onboarding; invoice detail shows "Payout blocked until verification" when `blockedReason === "kyc"`.

- [ ] **Step 1: Implement** actions and pages.
- [ ] **Step 2: Verify** spec §9 worker half: as Alice approve the invoice created in Task 8 and watch it settle within ~2 min; open on-chain record; withdraw to KRW and see it complete after ~8 s; as Eun complete onboarding and retry a blocked invoice from the company side.
- [ ] **Step 3: Check** `/worker` at 375 px in devtools: no horizontal scroll, buttons reachable.
- [ ] **Step 4: Commit** `feat: worker home, approvals, payment request, withdraw, settings, KYC wizard`

---

### Task 10: Explorer, notifications page, worker-initiated invoices on company side, responsive pass

**Files:**
- Create: `src/app/explorer/tx/[hash]/page.tsx`, `src/app/notifications/page.tsx`
- Modify: `src/app/(company)/company/approvals/page.tsx` (add worker-initiated invoices section using `approveWorkerInvoice`)
- Modify: shell components for `md:` breakpoints

**Interfaces:**
- Explorer page is public (no session): hash, status, block, from, to, token, amount, gas, raw calldata (monospace, wrapped), decoded memo panel with invoice link. In testnet mode it redirects to Basescan.
- Notifications page lists all for the current persona, grouped by day, marks all read on open.

- [ ] **Step 1: Implement** both pages and the approvals addition.
- [ ] **Step 2: Verify** explorer link from an invoice detail opens and decodes; worker "Request payment" appears under company approvals and approving schedules it.
- [ ] **Step 3: Commit** `feat: in-app explorer, notifications page, worker-initiated invoice approvals`

---

### Task 11: Rehearsal, production deploy, docs

**Files:**
- Create: `docs/demo-script.md`
- Modify: `README.md` (stack, run locally, env, demo script link, production URL)

- [ ] **Step 1: Run** `npm test && npx tsc --noEmit && npm run build` → all green.
- [ ] **Step 2: Deploy** `git push origin main` (or `vercel --prod --yes`); confirm `vercel env ls` has `SEED_SECRET`, `CHAIN_MODE`, `SCHEDULER`, Upstash vars in production.
- [ ] **Step 3: Seed production** `curl -X POST "$PROD_URL/api/seed" -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'` → counts.
- [ ] **Step 4: Rehearse** spec §9 end to end on the production URL; `npx workflow inspect runs --backend vercel` shows runs. If settlement never fires, set `SCHEDULER=tick` in production env, redeploy, rehearse again.
- [ ] **Step 5: Write** `docs/demo-script.md` (the §9 sequence with persona names and expected on-screen results) and update README.
- [ ] **Step 6: Commit** `docs: demo script, README with production URL` and push.

Stretch (only if done before 14:30): fund a Base Sepolia hot wallet, set `CHAIN_MODE=testnet` on a preview deployment, run one real invoice, paste the Basescan link in the README.
