# Settlivo

> 스테이블코인과 블록체인으로 해외 기업과 원격 근무자 간 복잡한 대금 지급 절차를 간소화하고, 송금 시간과 수수료를 줄이는 글로벌 정산 플랫폼. 회사가 현지 통화로 인보이스를 발행하면 워커가 승인하고, 예약된 시각에 USDC로 자동 정산되며, 워커는 현지 통화로 출금한다. 모든 것은 기본적으로 시뮬레이션이다.

**Production** https://settlivo.vercel.app · **튜토리얼** [docs/tutorial.md](docs/tutorial.md) · **데모 스크립트** [docs/demo-script.md](docs/demo-script.md) · **피치 덱** [docs/pitch/settlivo-pitch.pdf](docs/pitch/settlivo-pitch.pdf) · **설계 스펙** [docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md) · **로드맵** [docs/roadmap.md](docs/roadmap.md) · **시장 분석** [docs/research/2026-10-24-market-competitive-analysis.md](docs/research/2026-10-24-market-competitive-analysis.md) · **기여 규칙** [AGENTS.md](AGENTS.md)

## 목차

1. [무엇을 만들었나](#무엇을-만들었나)
2. [데모에서 보여주는 기능](#데모에서-보여주는-기능)
3. [아키텍처](#아키텍처)
4. [도메인 모델](#도메인-모델)
5. [화면과 라우트](#화면과-라우트)
6. [페르소나와 시드 데이터](#페르소나와-시드-데이터)
7. [실행과 설정](#실행과-설정)
8. [저장소 구조](#저장소-구조)
9. [문서 지도](#문서-지도)
10. [알려진 한계와 다음 단계](#알려진-한계와-다음-단계)

## 무엇을 만들었나

**한 줄 아이디어.** 스테이블코인과 블록체인으로 해외 기업과 원격 근무자 간 복잡한 대금 지급 절차를 간소화하고, 송금 시간과 수수료를 줄이는 **글로벌 정산 플랫폼**.

**타깃 해외 시장**

| 구분 | 대상 |
| --- | --- |
| **기업 고객** | 해외 글로벌 원격 채용 기업 |
| **근무자 고객** | 해당 기업에서 일하며 해외 급여를 받는 개발자·디자이너 등 원격 근무자 |

**해결하려는 문제**

- **복잡한 지급 절차** — 국가마다 다른 은행·송금 체계로 인해 해외 근무자에게 급여를 지급하는 과정이 번거로움
- **긴 송금 시간** — 국제 은행 송금은 도착까지 수일이 걸리는 경우가 많음
- **높은 수수료** — 중개 은행 수수료와 환전 비용이 누적되어 근무자가 실제 받는 금액이 줄어듦

**솔루션**

- **스테이블코인 기반 지급** — 가치가 안정적인 스테이블코인(USDC, 워커별로 USDT 선택 가능)으로 국경과 관계없이 급여·대금 지급
- **블록체인 정산** — 중개 기관을 줄여 송금 시간을 단축하고, 지급 내역을 투명하게 기록. 모든 전송의 calldata에 인보이스 ID와 SHA-256 해시를 메모로 심어 사후 검증 가능
- **통합 정산 플랫폼** — 기업은 여러 국가의 근무자에게 한 곳에서 일괄 지급(페이롤 런), 근무자는 간편하게 수령하고 현지 통화로 출금

**기대 효과**

- 기업: 해외 급여 지급 업무 간소화 및 운영 비용 절감 (대시보드의 "Saved vs. bank wires" 위젯이 은행 송금 기준 `$35 + 2.2% FX spread, 4 business days` 대비 절감액을 계산)
- 근무자: 더 빠르고 저렴하게 급여 수령 (건당 수수료는 Free 플랜만 0.5%, 유료 플랜은 월정액이라 건당 0; 정산 약 10분 vs 은행 3–5 영업일)

**데모 범위.** 이 저장소는 해커톤 데모 MVP다. 인증(비밀번호 없는 페르소나 선택), KYC, 온체인 전송, 오프램프는 모두 시뮬레이션이며, FX 환율만 실제 API에서 가져온다(실패 시 고정 fallback). 자세한 제한은 [알려진 한계와 다음 단계](#알려진-한계와-다음-단계) 참고.

## 데모에서 보여주는 기능

아래 표의 모든 기능은 [docs/demo-script.md](docs/demo-script.md)(심사위원용 5분 스크립트)와 [docs/tutorial.md](docs/tutorial.md)(10분 핵심 기능 가이드)에서 실제로 클릭해 확인할 수 있다. 스펙 열은 설계 스펙의 해당 절이다.

| 기능 | 누가 | 화면 (route) | 스펙 | 튜토리얼 |
| --- | --- | --- | --- | --- |
| 페르소나 로그인 (비밀번호 없음, 쿠키 세션) | 모두 | `/login` | [§2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#2-users-and-personas) | [준비](docs/tutorial.md#준비) |
| 회사 대시보드 (Treasury balance, Paid in {Month}, In flight, Workers, 절감 위젯, Needs your attention) | 회사 | `/company` | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) | [준비](docs/tutorial.md#준비) |
| 인보이스 발행 — 현지 통화 금액, FX `Spread`(0.5%) / `Fixed`(24 h 고정, 1.1%) 선택, 실시간 USDC 미리보기 | 회사 | `/company/invoices/new` | [§5.1](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout), [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed) | [1. 인보이스 발행](docs/tutorial.md#1-인보이스-발행) |
| 워커 승인/거절 (`Approve` / `Reject` + 사유, 토스트 "Email sent to the counterparty.") | 워커 | `/worker`, `/worker/invoices/[id]` | [§5.1](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout) | [2. 승인과 자동 정산](docs/tutorial.md#2-승인과-자동-정산) |
| 예약 정산 + 타임라인 (Issued → Approved & scheduled → Settling on-chain → Confirmed) | 시스템 | `/company/invoices/[id]`, `/worker/invoices/[id]` | [§5.4](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#54-settlement-step-shared-by-both-scheduler-engines) | [2. 승인과 자동 정산](docs/tutorial.md#2-승인과-자동-정산) |
| FX 비교 카드 (`Quote rate (at issue)` vs `Executed rate (at send)`, Change, Applied rate, Fee, `30-day KRW/USD` sparkline) | 회사·워커 | 인보이스 상세 | [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed) | [3. 온체인 검증](docs/tutorial.md#3-온체인-검증) |
| 온체인 기록 검증 (`Verified` / `Mismatch`) + 인앱 익스플로러 (Decoded Settlivo memo) | 회사·워커 | 인보이스 상세, `/explorer/tx/[hash]` | [§5.6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#56-on-chain-invoice-record) | [3. 온체인 검증](docs/tutorial.md#3-온체인-검증) |
| 출금 (오프램프 시뮬레이션, 0.5% 수수료, 은행 송금 비교표, Processing → Completed) | 워커 | `/worker/withdraw` | [§5.7](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#57-off-ramp-simulation) | [4. 출금](docs/tutorial.md#4-출금) |
| 페이아웃 설정 변경 → 회사 승인/거절(사유) (PrefsDiff: Wallet / Stablecoin / Display currency / Cadence / Bank account; 거절은 `prefs_rejected` 알림) | 워커 → 회사 | `/worker/settings` → `/company/approvals` | [§5.3](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves) | [더 보기](docs/tutorial.md#더-보기) |
| 워커 결제 요청 → 회사 `Approve & schedule` | 워커 → 회사 | `/worker/request` → `/company/approvals` | [§5.3](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves) | [더 보기](docs/tutorial.md#더-보기) |
| 페이롤 런 (KYC 인증된 워커 일괄 지급, `Settled x / n`, 행 단위로 Confirmed) | 회사 | `/company/payroll`, `/company/payroll/[runId]` | [§5.5](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#55-payroll-run-batch) | [5. 페이롤 런](docs/tutorial.md#5-페이롤-런) |
| KYC 차단 (`Blocked · KYC`) → 3단계 인증 위자드 → 회사의 `Retry settlement` | 워커 → 회사 | `/worker/onboarding`, `/company/invoices/[id]` | [§5.8](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#58-kyc-simulation), [§8](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#8-error-handling-and-fallbacks) | [6. KYC 차단과 재시도](docs/tutorial.md#6-kyc-차단과-재시도) |
| 알림 (헤더 벨 최근 8건 + 미읽음 배지, 전체 목록) | 모두 | 헤더 벨, `/notifications` | [§5.9](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#59-notifications) | [더 보기](docs/tutorial.md#더-보기) |
| 조직 전환 (Jordan: Acme Remote ⇄ Nordwind Labs) | 회사 | 헤더 `Organization` select | [§5.10](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#510-multi-org) | [7. 조직 전환과 구독 플랜](docs/tutorial.md#7-조직-전환과-구독-플랜) |
| 워커 등록 / 제거 / 오프보딩 (최종 정산 인보이스 → `Former`) | 회사 | `/company/workers`, `/company/workers/[id]` | [§5.11](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#511-worker-lifecycle) | [더 보기](docs/tutorial.md#더-보기) |
| 조직 지갑 (관리하는 모든 조직 × 지갑, Default / Make default, Add wallet) | 회사 | `/company/wallets` | [§5.12](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets) | [더 보기](docs/tutorial.md#더-보기) |
| 워커 지갑 + 링크 요청 (회사가 지갑/은행 연결 요청, 워커가 수락/거절) | 워커·회사 | `/worker/settings`, `/company/workers/[id]` | [§5.12](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets) | [더 보기](docs/tutorial.md#더-보기) |
| 구독 플랜 / 송금 한도 — 보내는 계정이 구독(Free `3 sends / month` · Pro $9 · Business $99, 유료는 `Unlimited sends`), 받는 쪽은 무료. Free 한도 소진 시 `Blocked · Plan` → `/company/billing`의 `Upgrade to Pro` / `Upgrade to Business`(카드 체크아웃 시뮬레이션) → 보류된 지급 자동 재개. 고정 환율 프리미엄과 오프램프 수수료는 건별 유지 | 회사 | `/company/billing` | [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed), [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) | [7. 조직 전환과 구독 플랜](docs/tutorial.md#7-조직-전환과-구독-플랜) (시드의 Nordwind가 Free 3/3 소진 상태라 Mia로 로그인해 인보이스를 발행하면 바로 볼 수 있다) |
| 실패 / 재시도 (`Failed` → `Retry settlement`, 45 s tick 안전망, 에러 페이지) | 회사 | `/company/invoices/[id]` | [§8](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#8-error-handling-and-fallbacks) | [더 보기](docs/tutorial.md#더-보기) |
| 데이터 리셋 (`/login`의 `Reset demo data` 버튼 + `Reset code`, `POST /api/seed` + `x-seed-secret`, `npm run seed`) | 발표자 | `/login`, `/api/seed` | [§7](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#7-seed-data) | [더 보기](docs/tutorial.md#더-보기) |

자동 검증은 `npm test`(Vitest 58개)와 `npm run e2e`(Playwright, 데모 스크립트 18단계)로 돌린다.

## 아키텍처

단일 Next.js(App Router) 앱이 Vercel에 배포된다. 쓰기는 Server Action, 읽기는 3초 폴링으로 갱신된다.

```
                       ┌──────────────────────────────────────────────────────────────┐
  Browser              │  Next.js app (src/app)                                       │
  ─────────            │                                                              │
  company / worker  ⇄  │  pages ──▶ src/lib/queries ──▶ src/lib/db/repo.ts ──▶ KV     │ ⇄  Upstash Redis
  pages                │  forms ──▶ src/lib/actions (Server Actions)                  │    또는 .data/kv.json
  Poller: 3 s 마다     │                                                              │    (KV_MODE)
  GET /api/tick 후     │  scheduleInvoice() ──▶ Scheduler  SCHEDULER=workflow | tick   │
  router.refresh()  ⇄  │     workflow: src/workflows/invoice.ts (durable run/invoice) │ ⇄  Vercel Workflow
                       │     tick:     GET /api/tick (가장 오래된 due 인보이스 1건)   │
                       │                       │                                      │
                       │                       ▼                                      │
                       │  settleInvoice() ──▶ ChainAdapter  CHAIN_MODE=simulated|testnet│ ⇄  (testnet) Base Sepolia
                       │     simulated: src/lib/chain/simulated.ts (tx를 KV에 저장)   │     via viem
                       │     testnet:   src/lib/chain/testnet.ts                      │
                       │                       │                                      │
                       │  FX service: src/lib/fx (live fetch + fallback + drift) ─────┼─▶  FX_API_URL
                       └──────────────────────────────────────────────────────────────┘
```

구성 요소:

- **Web app** — 회사 화면 `src/app/(company)/company/*`, 워커 화면 `src/app/(worker)/worker/*`, 공용 `login` / `notifications` / `explorer`. 각 레이아웃이 [`src/components/shell/header.tsx`](src/components/shell/header.tsx)를 렌더링하고, 그 안의 [`Poller`](src/components/shell/poller.tsx)([`use-poll.ts`](src/hooks/use-poll.ts))가 탭이 보이는 동안 3초마다 `GET /api/tick`을 호출한 뒤 `router.refresh()`를 실행한다. 페이지 데이터는 [`src/lib/queries/company.ts`](src/lib/queries/company.ts), [`src/lib/queries/worker.ts`](src/lib/queries/worker.ts)가 로드한다.
- **인증** — [`src/proxy.ts`](src/proxy.ts)가 `settlivo_session` 쿠키 없는 `/company/*`, `/worker/*`, `/notifications` 요청을 `/login`으로 307 리다이렉트한다. [`src/lib/session.ts`](src/lib/session.ts)의 `requireCompany()` / `requireWorker()`가 역할을 검사한다. 비밀번호는 없다. [`src/lib/actions/session.ts`](src/lib/actions/session.ts)의 `loginAs`가 페르소나 ID를 받아 7일짜리 httpOnly 쿠키를 쓴다.
- **저장소** — [`src/lib/db/repo.ts`](src/lib/db/repo.ts)가 유일한 쓰기 API. [`src/lib/db/redis.ts`](src/lib/db/redis.ts)의 `getRedis()`가 Upstash 또는 로컬 JSON 파일 저장소([`src/lib/db/kv.ts`](src/lib/db/kv.ts), `.data/kv.json`)를 고른다. 페이지는 Redis를 직접 import하지 않는다.
- **Scheduler** — [`src/lib/scheduler/index.ts`](src/lib/scheduler/index.ts)의 `scheduleInvoice(id)` 뒤에 두 엔진이 있다.
  - `workflow`(기본): [`src/workflows/invoice.ts`](src/workflows/invoice.ts)가 인보이스마다 durable run 하나를 시작한다. `pending_approval`이면 hook `approve:{id}`를 기다리고, `scheduledAt`까지 `sleep`한 뒤 settle step을 실행한다. 승인 시 `resumeHook`을 최대 6회(500 ms 간격) 시도하고 실패하면 새 run을 시작한다.
  - `tick`: 예약 시점에는 아무 일도 하지 않고, [`GET /api/tick`](src/app/api/tick/route.ts)이 폴링마다 due 상태의 가장 오래된 인보이스 **1건**을 정산한다. 페이지가 열려 있지 않으면 정산되지 않는다.
  - workflow 모드에서도 tick은 `scheduledAt`보다 45초 이상 지난 인보이스를 정산하는 안전망으로 동작한다. Workflow `start()`가 실패해도(`scheduleInvoice`는 경고 로그만 남기고 던지지 않는다) 인보이스는 이미 저장돼 있으므로 이 경로로 정산된다. tick은 또한 생성 후 8초가 지난 `processing` 출금을 `completed`로 바꾼다.
  - Workflow 빌더는 Next.js 엔트리포인트에서 도달 가능한 `"use workflow"` 파일만 발견한다. `src/workflows/invoice.ts` → `src/lib/scheduler` → [`src/app/api/invoices/[id]/approve/route.ts`](src/app/api/invoices/[id]/approve/route.ts) import 체인을 끊으면 워크플로가 빌드에서 조용히 사라진다.
- **Settlement** — [`src/lib/settlement/settle.ts`](src/lib/settlement/settle.ts)의 `settleInvoice()`는 두 엔진이 공유한다. 순서: KYC 게이트 → 플랜 게이트(조직 `plan`의 이번 달 송금 한도, 소진 시 `scheduled` + `blockedReason: "plan"`, 회사에 `invoice_blocked_plan` 알림 "Monthly send limit reached (3 on Free)" → `/company/billing`) → `sending` → FX 조회(시뮬레이션 모드에서 ±0.3% drift) → 가격 산정(`feeUsdc`는 `planFeeUsdc`, 유료 플랜은 spread 0) → 워커의 기본 지갑으로 `chain.transfer` (calldata에 메모) → `waitForConfirmation` → `confirmed` → 조직 `plan.sendsThisMonth` +1(Free 한도가 막 소진되면 "Last free send of the month used" 알림) → 양쪽 알림. `sending` 이후 예외는 `failed` + 에러 메시지.
- **Chain adapter** — [`src/lib/chain/types.ts`](src/lib/chain/types.ts)의 `ChainAdapter` 인터페이스. `simulated`([`simulated.ts`](src/lib/chain/simulated.ts))는 무작위 32바이트 해시, 블록 번호 `21,400,000 + 카운터`, 가스 51,000–64,999, 2–5초 확인 지연(`SIM_CONFIRM_MS`)을 만들고 tx와 잔액을 KV에 저장해 인앱 익스플로러를 뒷받침한다. `testnet`([`testnet.ts`](src/lib/chain/testnet.ts))는 viem + Base Sepolia USDC, 플랫폼 핫월렛이 서명하며 USDT는 지원하지 않는다. 메모 코덱은 [`memo.ts`](src/lib/chain/memo.ts).
- **FX service** — [`src/lib/fx/rates.ts`](src/lib/fx/rates.ts)가 `FX_API_URL`(기본 open.er-api.com, 2.5초 타임아웃)에서 USD 기준 환율을 가져오고 실패하면 [`fallback.ts`](src/lib/fx/fallback.ts)의 고정값(KRW 1385.2, PHP 58.4, BRL 5.42, PLN 3.98, VND 25310, EUR 0.921)을 쓴다. `fx:rates` 캐시는 live이고 10분 미만일 때만 재사용. 정산 때마다 `fx:history`에 포인트가 쌓여 30일 sparkline이 된다. 가격 규칙은 [`pricing.ts`](src/lib/fx/pricing.ts), 6자리 변환은 [`convert.ts`](src/lib/fx/convert.ts).

**두 개의 환경 스위치.** `CHAIN_MODE`와 `SCHEDULER`는 모듈 최상위에서 읽지 않고 호출 시점에 [`chainMode()`](src/lib/chain/index.ts) / [`schedulerMode()`](src/lib/scheduler/index.ts)로 읽는다. `getChain()`은 호출마다 어댑터를 새로 만든다. 값이 정확히 `testnet` / `tick`일 때만 해당 모드이고 그 외는 모두 기본값(`simulated` / `workflow`)이다. (`/api/tick`은 `process.env.SCHEDULER`를 요청 시점에 직접 읽는다.) Redis나 env를 모듈 최상위에서 읽지 않는 규칙은 [AGENTS.md](AGENTS.md)에 있다.

## 도메인 모델

스펙 [§4 Data model](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#4-data-model-redis)과 [§4.1 Ontology](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#41-ontology)가 원본이다. 타입은 [`src/lib/domain/types.ts`](src/lib/domain/types.ts).

**온톨로지**

```
User (company admin | individual)
 ├─ administers N Organizations            (회사 사용자; 조직 전환, §5.10)
 │    ├─ owns M Wallets                     (treasury + 추가 지갑, §5.12)
 │    ├─ has Memberships with Workers       (register / remove / offboard, §5.11)
 │    ├─ issues Invoices, runs PayrollRuns
 │    └─ sends LinkRequests to Workers      (지갑 또는 은행 계좌 연결 요청)
 └─ is a Worker (individual user)
      ├─ owns N Wallets (platform | external) + a BankAccount
      ├─ has KYC and PayoutPrefs (기본 페이아웃 지갑)
      ├─ approves / requests Invoices, makes Withdrawals
      └─ answers LinkRequests
정산은 조직의 기본 지갑에서 워커의 기본 활성 지갑으로 지급하고,
지갑 id를 인보이스에, 메모를 온체인에 기록한다.
```

Membership 상태는 `active` → `offboarding`(최종 정산 인보이스 대기) → `offboarded`. 제거(`Remove from team`)는 열린 인보이스(`pending_approval` / `scheduled` / `sending`)가 있으면 서버가 `Settle or reject N open invoice(s) first`로 거부한다([`membership.ts`](src/lib/domain/membership.ts)).

**인보이스 상태 머신** ([`src/lib/domain/invoice-status.ts`](src/lib/domain/invoice-status.ts))

```
draft ─▶ pending_approval ─▶ scheduled ─▶ sending ─▶ confirmed
              │                  ▲           │
              ▼                  │           ▼
           rejected              └──────── failed        (Retry settlement: failed → scheduled)
```

- `draft`는 타입에만 있고 아무 코드도 만들지 않는다. 회사 인보이스와 워커 결제 요청은 `pending_approval`로, 페이롤 런과 오프보딩 최종 정산은 승인 없이 바로 `scheduled`로 생성된다.
- 허용되지 않는 전이는 `Invalid invoice transition {from} -> {to}`를 던진다. 모든 전이는 `history[{status, at, by, note}]`에 쌓이며 `by`는 `org:{id}` / `worker:{id}` / `system:settlement` / `system:retry`, 또는 `POST /api/invoices/[id]/approve`로 승인한 경우 본문 `by`(기본 `api`; 타임라인에 `api`로 표시).
- **차단(`blockedReason: "kyc" | "plan"`)은 상태가 아니다.** 두 경우 모두 인보이스는 `scheduled`에 머물고 `/api/tick`은 `blockedReason`이 있는 인보이스를 건너뛴다. `scheduledAt`은 해시의 일부라 재시도 때도 바뀌지 않는다.
  - `kyc`: 워커의 `kyc.status`가 `verified`가 아니면 찍히고 배지는 `Blocked · KYC`. 워커가 인증을 마쳐도 자동 재시도는 없고, 회사가 `Retry settlement`를 눌러야 플래그가 지워진다.
  - `plan`: 보내는 조직의 플랜에 이번 달 송금 횟수가 남지 않으면 찍히고 배지는 `Blocked · Plan`. 대시보드 Needs your attention에는 `{이름} · held by plan limit`, 타임라인에는 `Held by the sender's plan limit`, 워커 홈에는 `On hold: company plan limit`, 페이롤 런의 `Settled` 카드 힌트에는 `held by plan limit · see Billing`, 회사 인보이스 상세에는 `Held by your plan: Free allows 3 sends a month and all are used. Upgrade to send now, or wait until {renewsAt}.`가 보인다. 해제는 회사가 `/company/billing`에서 업그레이드하면 보류 인보이스 전부가 자동으로 다시 예약되며(Retry 불필요), 한도가 남아 있을 때는 `Retry settlement`로도 지워진다.

**FX 가격 산정** ([`src/lib/fx/pricing.ts`](src/lib/fx/pricing.ts), 스펙 [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed))

| 항목 | `spread` (기본) | `fixed` |
| --- | --- | --- |
| 폼 옵션 문구 | `Spread · market rate at send · 0.5% fee` | `Fixed · lock today's rate for 24 h · 1.1% fee` |
| 건당 수수료(`feeBps`, Free 플랜 기준) | 50 bps | 110 bps |
| 발행 시 기록 | `rateMode`, `feeBps`, `quoteRate` | + `lockedRate` (= 발행 시 환율), `lockExpiresAt` (= `scheduledAt` + 24 h) |
| 정산 시 `appliedRate` | 송금 시점 시장 환율 | `now <= lockExpiresAt`이면 `lockedRate`, 아니면 시장 환율 + `lockExpired: true` |
| `executedRate` | 항상 송금 시점 시장 환율 (Quote vs Executed 비교용) | 동일 |
| `usdcAmount` | `floor(amount / appliedRate × 1e6) / 1e6` | 동일 |
| `feeUsdc` (`planFeeUsdc`) | Free 플랜: `floor(usdcAmount × feeBps / 10000)` (BigInt 마이크로 단위); Pro/Business: `0.000000` | Free: 동일, 락이 만료돼도 110 bps; Pro/Business: 60 bps(110 − 50) 프리미엄만 |
| 락 만료 시 | — | 회사에 `Rate lock expired, settled at market` 알림, FX 카드에 `(lock expired, market rate used)` |

`rateMode`가 없는 레코드(예: 오프보딩 최종 정산 인보이스)는 `spread`로 취급된다. 50/110 bps는 건당 요율이지만 실제로 청구되는 것은 Free 플랜뿐이다([`plan.ts`](src/lib/domain/plan.ts) `planFeeUsdc`); 시드의 Acme는 Business라 데모의 Acme spread 인보이스는 FX 카드에 `Fee 0.00 USDC`로 보이고, 대시보드 절감 위젯 각주도 "On a paid plan, per-transfer fees are 0."로 끝난다. 시뮬레이션 모드의 정산은 환율에 ±0.3% drift를 넣어 Quote/Executed 차이가 화면에 보이게 한다.

**온체인 메모와 "Verified"** ([`src/lib/chain/memo.ts`](src/lib/chain/memo.ts), 스펙 [§5.6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#56-on-chain-invoice-record))

- calldata = ERC-20 `transfer(to, amount)` 인코딩(selector `0xa9059cbb`, 68바이트) 뒤에 UTF-8 문자열 `SETTLIVO|{invoiceId}|{invoiceHash}`를 hex로 덧붙인다.
- `invoiceHash` = `sha256(JSON.stringify({id, orgId, workerId, amount, currency, scheduledAt, memo, rateMode ?? "spread", lockedRate ?? null}))` (키 순서 고정).
- 인보이스 상세의 "On-chain record" 카드는 저장된 tx의 calldata에서 메모를 디코딩하고, 현재 인보이스 레코드로 해시를 다시 계산한다. `memo.invoiceId === invoice.id`이고 `memo.invoiceHash === 재계산 해시`일 때만 **Verified**(초록 방패), 아니면 **Mismatch**(빨강). 즉 금액·통화·예약 시각·메모·환율 모드 중 하나라도 사후에 바뀌면 검증이 깨진다.
- 인앱 익스플로러 `/explorer/tx/[hash]`가 같은 calldata를 "Decoded Settlivo memo"로 보여준다. `CHAIN_MODE=testnet`에서는 Basescan으로 리다이렉트한다.

**ID 규칙.** `prefix_` + 8자 nanoid ([`src/lib/domain/ids.ts`](src/lib/domain/ids.ts)). 접두사: `org`, `wrk`, `inv`, `tx`, `run`, `wd`, `ntf`, `wal`, `lrq`. 시드 데이터는 고정 ID(`org_acme`, `wrk_alice`, `wal_acme_tre` …)를 쓰고, 생성된 이력은 PRNG seed `20261024`로 결정적이다.

**금액 표현.**
- USDC/USDT 금액은 저장소에서 항상 6자리 소수 문자열(`"3042.571428"`), 절대 float가 아니다. 현지 통화 금액은 number.
- 화면 렌더링은 [`components/ui/money.tsx`](src/components/ui/money.tsx)(`Money`, `Usdc`) 또는 [`src/lib/format.ts`](src/lib/format.ts)(`formatMoney`, `formatUsdc`)만 거친다. USDC는 화면에서 2자리(툴팁에 6자리 전체), 현지 통화는 narrow symbol(₩, ₱, R$, zł, ₫), KRW/VND는 0자리. 테이블 셀 안에서는 통화 기호 왼쪽·숫자 오른쪽 정렬.
- 환율은 `formatRate`: 100 초과면 최대 2자리, 아니면 최대 4자리(끝 0은 생략) (`1,385.2 KRW/USD`, `0.921 EUR/USD`).
- 날짜는 `DEMO_TIMEZONE`(기본 `Asia/Seoul`)으로 `Oct 24, 02:05 PM` 형식.

## 화면과 라우트

스펙 [§6 Screens](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens)에 있는 라우트와 `src/app` 아래의 라우트는 1:1로 일치해야 한다([AGENTS.md](AGENTS.md) 규칙). `src/app/.well-known/workflow/`는 빌드 산출물이라 제외.

| Route | 역할 | 목적 | 스펙 |
| --- | --- | --- | --- |
| `/` | 모두 | 세션이 있으면 `/company` 또는 `/worker`, 없으면 `/login`으로 리다이렉트 | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `/login` | 공개 | 페르소나 선택기. 왼쪽은 샘플 "Settlement receipt"와 실시간/참조 환율, 오른쪽은 "Company admins" / "Workers" 카드. `Sign in with Google` 버튼은 `#accounts` 앵커로 스크롤만 한다 | [§2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#2-users-and-personas) |
| `/company` | 회사 | 대시보드: 4개 stat card, Recent invoices(최근 8건), Saved vs. bank wires, Needs your attention | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `/company/invoices` | 회사 | 인보이스 목록, 필터 `All` / `Open` / `Confirmed` / `Issues` (`?f=`) | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `/company/invoices/new` | 회사 | 인보이스 발행 폼 (Worker, Amount (local currency), Currency, Rate, Settle at = 지금 + 2분, Memo) | [§5.1](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout), [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed) |
| `/company/invoices/[id]` | 회사 | Timeline, FX & settlement amount, On-chain record, Details. 워커 요청이면 Approve/Reject, 실패·차단이면 Retry settlement | [§5.4](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#54-settlement-step-shared-by-both-scheduler-engines), [§5.6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#56-on-chain-invoice-record) |
| `/company/approvals` | 회사 | Payment requests (워커 발신 인보이스) + Payout setting changes (PrefsDiff) | [§5.3](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves) |
| `/company/payroll` | 회사 | 페이롤 런 빌더(활성 워커 체크박스, 금액은 마지막 confirmed 인보이스로 프리필, Rate 1회 선택) + Past runs | [§5.5](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#55-payroll-run-batch) |
| `/company/payroll/[runId]` | 회사 | `Settled x / n`, Total USDC, Saved vs bank wires, RunProgress 목록. 렌더링 시 run 상태를 `completed` / `partial`로 갱신 | [§5.5](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#55-payroll-run-batch) |
| `/company/wallets` | 회사 | 세션이 관리하는 모든 조직 × 지갑 (Label, Address, Kind, Balance, Paid this month, Default / Make default). 활성 조직에만 Add a wallet 폼 | [§5.12](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets) |
| `/company/billing` | 회사 | Current plan(tier, `{$} per month`, `Renews {date}`, `Sends this month: n of 3` 진행바, `Held payouts: n` + 보류 인보이스 링크), What per-transfer billing would have cost(Per-transfer fees vs Your plan), Plans(Free `3 sends / month` · Pro $9 · Business $99 `Unlimited sends`, 카드 체크아웃 시뮬레이션 `Upgrade to {Plan}` → 보류 인보이스 자동 재개, `plan_upgraded` 알림 "{org} is on {Plan}") | [§5.2](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed), [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `/company/workers` | 회사 | 워커 테이블 (Country, Payout, KYC, Since, Settlements, Pay) + Add worker + Former workers | [§5.11](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#511-worker-lifecycle) |
| `/company/workers/[id]` | 회사 | Payout settings, Wallets, Link requests(+ Send request), History, Offboarding (Offboard / Remove from team) | [§5.11](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#511-worker-lifecycle), [§5.12](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets) |
| `/worker` | 워커 | `Hi, {이름(first name)}`(`Hi, Alice`), KYC 배너(`Finish verification to receive payouts` · `{n} of 3 steps complete` · `Continue`), Available balance(현지 통화 + USDC), Upcoming, Needs your approval, Recent payouts | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `/worker/invoices/[id]` | 워커 | 회사 상세와 같은 카드(Timeline, FX, On-chain record). 회사 발신 `pending_approval`이면 Approve/Reject. 다른 워커의 인보이스는 404 | [§5.1](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout) |
| `/worker/request` | 워커 | 워커 발신 결제 요청 (Company, Amount, Rate, Preferred payout time, What is it for?) | [§5.3](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves) |
| `/worker/withdraw` | 워커 | 오프램프 시뮬레이션: 금액 입력, Settlivo vs Bank wire 비교표, History | [§5.7](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#57-off-ramp-simulation) |
| `/worker/settings` | 워커 | Wallets(Payout wallet, Use for payouts, Add wallet), Requests from your companies, How you get paid(승인 대기 변경 제출), Pending change | [§5.3](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves), [§5.12](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets) |
| `/worker/onboarding` | 워커 | KYC 위자드 3단계 (Identity document, Residential address, Tax information) → 3초 후 자동 인증 | [§5.8](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#58-kyc-simulation) |
| `/notifications` | 회사·워커 | 현재 페르소나의 알림 최대 200건, 날짜별 그룹. 열면 전부 읽음 처리 | [§5.9](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#59-notifications) |
| `/explorer/tx/[hash]` | 공개 | 시뮬레이션 익스플로러: Transaction details(hash, block, from/to, token transfer, gas, method), Input data + Decoded Settlivo memo. testnet이면 Basescan으로 리다이렉트 | [§5.6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#56-on-chain-invoice-record) |
| `POST /api/invoices/[id]/approve` | API | JSON `{approved?, by?, reason?}`로 `approveInvoice` 호출. 세션 검사 없음. Workflow 빌더가 `invoiceWorkflow`를 발견하게 하는 엔트리포인트 | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `GET /api/tick` | API | 클라이언트가 3초마다 호출. due 인보이스 1건 정산(tick 모드 즉시, workflow 모드는 45초 초과분만) + 8초 지난 출금 완료 처리. 응답 `{settled, withdrawalsCompleted}` | [§6](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) |
| `POST /api/seed` | API | 헤더 `x-seed-secret`이 `SEED_SECRET`과 같아야 함(아니면 401). 본문 `{flush?: boolean}` 기본 `true`. 응답 `{counts}` | [§7](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#7-seed-data) |

헤더 내비게이션 문구 — 회사: `Dashboard` / `Invoices` / `Payroll` / `Wallets` / `Billing` / `Workers` / `Approvals`; 워커: `Home` / `Request payment` / `Withdraw` / `Settings`.

상태 배지 문구 ([`status-badge.tsx`](src/components/ui/status-badge.tsx)): `Awaiting approval`, `Scheduled`, `Sending`, `Confirmed`, `Rejected`, `Failed`, `Blocked · KYC`, `Blocked · Plan`, `Processing`, `Completed`, `Verified`, `Pending`, `Active`, `Offboarding`, `Former`, `Accepted`, `Declined` (맵에는 `Draft`도 있지만 draft 인보이스를 만드는 코드가 없어 렌더링되지 않는다).

토스트는 세 곳에서만 뜬다: Approve(`Approved` — `Email sent to the counterparty.`), Confirm reject(`Rejected` — 같은 설명), Retry settlement(`Settlement restarted`). Issue invoice, Add worker, Offboard, Send request, Add wallet 등은 토스트 없이 리다이렉트하거나 다시 렌더링된다. Server Action이 던진 에러는 [`src/app/error.tsx`](src/app/error.tsx)의 "That didn't go through" 페이지로 간다. 로컬 `next dev`에서는 던진 메시지(예: `Settle or reject 2 open invoices first`)가 그대로 보이고, 프로덕션 빌드에서는 Next.js가 메시지를 가리므로(`error.digest`) 고정 문구 "The server declined the request, for example a missing wallet address or an unreachable service. Try again or go back."만 보인다.

## 페르소나와 시드 데이터

시드 정의는 [`src/lib/seed/personas.ts`](src/lib/seed/personas.ts)(고정 ID), 이력 생성은 [`src/lib/seed/generate.ts`](src/lib/seed/generate.ts), 적재는 [`src/lib/seed/index.ts`](src/lib/seed/index.ts). 스펙 [§7 Seed data](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#7-seed-data).

**조직**

| 조직 | ID | 국가/통화 | KYB | 지갑 (잔액) | 플랜 | 활성 워커 |
| --- | --- | --- | --- | --- | --- | --- |
| Acme Remote | `org_acme` | US / USD | verified | `Treasury` (platform, default, 48,250 USDC) · `Operations` (external, 12,500 USDC) | `Business` (Unlimited sends, 이번 달 6건, 2026-11-12 갱신) | Alice, Bob, Carlos, Eun |
| Nordwind Labs | `org_nordwind` | DE / EUR | verified | `Treasury` (platform, default, 21,900 USDC) · `EUR operations` (external, 4,200 USDC) | `Free` (월 3건 중 3건 사용 = 한도 소진, 2026-11-01 갱신 → 새 정산은 `Blocked · Plan`, `/company/billing`에서 업그레이드하면 자동 재개) | Alice, Dana (Finn은 former) |

**로그인 페르소나** (`/login`에 보이는 순서)

| 페르소나 | ID | 역할 | 조직 | 국가 · 통화 | KYC | 페이아웃 지갑 / 잔액 | 은행 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jordan Lee — Finance Lead · Acme Remote | `admin_acme` | company | Acme Remote **+ Nordwind Labs** (조직 전환 가능, 첫 로그인은 Acme) | US | — | — | — |
| Mia Schulz — People Ops · Nordwind Labs | `admin_nordwind` | company | Nordwind Labs | DE | — | — | — |
| Alice Kim | `wrk_alice` | worker | Acme + Nordwind | KR · KRW | Verified | `Settlivo wallet` (platform, default) 2,400 USDC; 외부 `Ledger (cold)` | KB Kookmin ****2841 |
| Bob Reyes | `wrk_bob` | worker | Acme | PH · PHP | Verified | 외부 `MetaMask` (default, USDT) 1,320.5 USDT; `Settlivo wallet` (platform, USDT로 표기, 화면 잔액 0). 420 USDC가 USDC 키로 미리 적재돼 있어 회사가 Bob의 설정 변경을 승인하면(지갑이 USDC로 재태깅되고 Settlivo wallet이 payout 지갑이 됨) 워커 대시보드 Available balance가 420 USDC로 바뀐다. 결제 주기 biweekly | BDO Unibank ****7730 |
| Carlos Mendes | `wrk_carlos` | worker | Acme | BR · BRL | Verified | `Settlivo wallet` 860 USDC | Nubank ****1190 |
| Dana Kowalski | `wrk_dana` | worker | Nordwind | PL · PLN | Verified | `Settlivo wallet` 1,975.25 USDC | mBank ****5522 |
| Eun Nguyen | `wrk_eun` | worker | Acme (2026-10-20 합류) | VN · VND | **KYC pending** (identity만 완료, 1/3) | `Settlivo wallet` 0 USDC, cadence per_invoice | 없음 (출금 불가) |
| Finn Larsen | `wrk_finn` | (로그인 불가) | Nordwind, 2026-09-30 offboarded | DK · EUR | Verified | `Settlivo wallet` 0 | Danske Bank ****9014 |

**리셋 직후 상태** — 데모에서 "이미 벌어진 일"로 등장하는 항목들

- 전체 카운트: orgs 2 · wallets 12 · linkRequests 1 · workers 6 · invoices 25 (confirmed 23) · txs 23 · payrollRuns 2 · withdrawals 3 · notifications 27 · fxHistory 31.
- 이력: Acme 월급 배치 3회(64·34·4일 전; Alice ₩4,200,000, Bob ₱95,000, Carlos R$9,800), 뒤의 두 번은 `Past runs`에 Completed 페이롤 런으로 남음. Nordwind 월급 3회(Alice ₩1,900,000 **fixed** → 목록에 `Fixed` 배지, Dana zł12,500). 보너스성 인보이스 6건(`Sprint bonus`, `Contract milestone`, `Design retainer`, `On-call stipend`). Finn Larsen(오프보딩)의 Nordwind 월급 2건(€4,100, 85·55일 전) — Nordwind 인보이스 목록과 Former workers 이력에 남음. 합계 confirmed 23 = 9 + 6 + 6 + 2. 완료된 출금 3건(Alice 1,500 USDC, Bob 900, Dana 2,200).
- 플랜: Acme는 `Business`(이번 달 6건, 무제한), Nordwind는 `Free` 한도 3건을 이미 다 써서(`sendsThisMonth: 3`) 리셋 후 새로 발행한 Nordwind 인보이스(예: Mia 또는 Nordwind로 전환한 Jordan이 Dana에게 발행)는 정산 시점에 `Blocked · Plan`으로 보류되고, Nordwind 조직에 "Monthly send limit reached (3 on Free)" 알림이 온다. `/company/billing`에서 업그레이드해야 전송된다(2026-11-01 갱신 전까지).
- Acme 대시보드 "Needs your attention"에 보이는 3건:
  - `Eun Nguyen · KYC pending` — ₫38,000,000 `Monthly salary`, 어제 예약, 상태 `scheduled` + `blockedReason: kyc` → 배지 `Blocked · KYC`.
  - `Bob Reyes changed payout settings` — 외부 MetaMask USDT → Settlivo wallet USDC로 바꾸는 `pendingPayoutPrefs`. `/company/approvals`의 PrefsDiff에서 승인.
  - `Carlos Mendes requested payment` — 워커 발신 R$2,400 `Overtime: release weekend`, 내일 09:24 UTC(화면은 Asia/Seoul 기준 `06:24 PM`) 희망 — 분은 PRNG가 정한다. `/company/approvals`에서 `Approve & schedule`.
- Acme → Bob 링크 요청 1건 pending: "Please link a USDC wallet for the Q4 bonus run." (Bob의 `/worker/settings`에 표시).
- 알림: Acme 조직 12건(7건 미읽음), Alice 5(1), Bob 4(1), Carlos 3(1), Nordwind 1(0), Dana 1(0), Eun 1(1: "Complete verification to receive ₫38,000,000").
- `fx:rates`는 `source: fallback`으로 저장되므로 첫 화면 로드 때 live 환율을 다시 가져온다(성공하면 "Live rates per USD", 실패하면 "Reference rates per USD").
- 날짜는 시드 시각 기준 상대값이지만 ID·해시·금액은 결정적이다(예: Carlos 요청 `inv_c611a9f8`, Eun 차단 `inv_f6e78376`).

**리셋 방법**

가장 쉬운 방법은 로그아웃 후 `/login` 하단의 `Reset demo data` 버튼이다. `SEED_SECRET`이 설정된 환경(프로덕션)에서는 `Reset code` 입력란에 그 값을 넣는다. 성공 시 "Demo data reset. Sign in to start the walkthrough.", 코드가 틀리면 "Wrong reset code."가 표시된다. 같은 일을 터미널에서:

```bash
# 프로덕션 (SEED_SECRET은 Vercel env)
curl -X POST https://settlivo.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'

# 로컬 (.env.local을 읽고 항상 flush)
npm run seed
```

`flush: true`(기본)는 KV 전체를 비운 뒤 다시 쓴다. `flush: false`로 재시드하면 문서는 덮어써지지만 알림·FX 이력 리스트는 중복으로 쌓이므로 데모 전에는 항상 flush한다.

## 실행과 설정

**로컬 실행**

```bash
npm install
cp .env.example .env.local   # 선택: Upstash 변수가 없으면 .data/kv.json 파일 저장소를 쓴다
npm run seed                 # flush + 데모 데이터 적재 (dotenv -e .env.local -- tsx scripts/seed.ts)
npm run dev                  # http://localhost:3000 → /login
```

**검증**

```bash
npm test                     # Vitest: 13 파일, 58 테스트 (~3 s)
npm run typecheck            # tsc --noEmit
npm run build                # next build (Workflow 빌드 포함)
npm run e2e                  # Playwright: docs/demo-script.md 18단계 (최초 1회: npx playwright install chromium)
```

`npm run e2e`는 [`playwright.config.ts`](playwright.config.ts)가 `npx tsx scripts/seed.ts && npx next dev -p 3100`을 `KV_MODE=file`, `KV_FILE=.data/kv-e2e.json`, `SCHEDULER=tick`(`E2E_SCHEDULER`로 override), `CHAIN_MODE=simulated`, `SIM_CONFIRM_MS=500`, 도달 불가한 `FX_API_URL`(fallback 환율 강제), `WORKFLOW_LOCAL_DATA_DIR=.workflow-data-e2e`, `WORKFLOW_LOCAL_RECOVER_ACTIVE_RUNS=0`(Workflow 로컬 상태를 dev 디렉터리와 분리하고 오래된 run의 재개를 막음)로 띄운 뒤 [`e2e/demo.spec.ts`](e2e/demo.spec.ts)를 단일 chromium 워커로 직렬 실행한다. `PLAYWRIGHT_BASE_URL=https://… SEED_SECRET=… npm run e2e`처럼 주소를 주면 로컬 서버 대신 그 주소를 `POST /api/seed`로 리셋하고 테스트한다 — `SEED_SECRET`은 리셋 헤더 `x-seed-secret`에 쓰이므로 비어 있으면 401로 전부 실패한다. 단위 테스트는 [`vitest.config.ts`](vitest.config.ts) 기준 `src/**/*.test.ts`(memo/hash, simulated chain, FileKv, 상태 머신, membership, wallets, plan(구독 플랜·월 전송 한도), FX convert/pricing/rates, format, settle/approve(플랜 게이트 포함), delay).

**환경 변수** ([`.env.example`](.env.example), 스펙 [§10](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#10-configuration))

| Env | 값 | 기본값 | 읽는 곳 |
| --- | --- | --- | --- |
| `CHAIN_MODE` | `simulated` \| `testnet` | `simulated` | `chainMode()` 호출 시점 |
| `SCHEDULER` | `workflow` \| `tick` | `workflow` | `schedulerMode()` 호출 시점, `/api/tick` |
| `SEED_SECRET` | 임의 문자열. `POST /api/seed`를 보호하고 `/login`의 `Reset demo data` 버튼이 요구하는 Reset code | — (미설정이면 API는 항상 401, 버튼은 코드 없이 동작) | `api/seed`, `actions/seed` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash 통합이 주입 (`UPSTASH_REDIS_REST_*`도 허용, 우선) | — | `getRedis()` |
| `KV_MODE` | `auto` \| `file` \| `upstash`; `file` = `.data/kv.json` JSON 저장소. Upstash 변수가 없으면 자동으로 file | `auto` | `getRedis()` |
| `KV_FILE` | 파일 저장소 경로 override (e2e가 `.data/kv-e2e.json`으로 사용). `KV_MODE`가 file로 결정됐을 때만 적용. `.env.example`에는 없다 | `<cwd>/.data/kv.json` | `getRedis()` |
| `FX_API_URL` | USD 기준 `{ rates }`를 돌려주는 키 없는 FX 엔드포인트 | `https://open.er-api.com/v6/latest/USD` | `getRates()` |
| `SIM_CONFIRM_MS` | 시뮬레이션 체인 확인 지연(ms) | 무작위 2–5 s | `SimulatedChain.waitForConfirmation` |
| `DEMO_TIMEZONE` | 서버 렌더링 시각의 IANA 존 (Vercel은 UTC) | `Asia/Seoul` | `formatDateTime` |
| `BASE_SEPOLIA_RPC_URL`, `PLATFORM_PRIVATE_KEY`, `USDC_ADDRESS` | testnet 모드 전용. `USDC_ADDRESS`와 `PLATFORM_PRIVATE_KEY`가 없으면 `{NAME} is required for CHAIN_MODE=testnet` | RPC 미설정 시 viem `baseSepolia` 기본 RPC(`https://sepolia.base.org`); `USDC_ADDRESS`·`PLATFORM_PRIVATE_KEY`는 코드 기본값 없음(필수). `.env.example`의 `0x036CbD53842c5426634e7929541eC2318f3dCF7e`는 Base Sepolia USDC 샘플값 | `TestnetChain` |

**KV 모드.** `KV_MODE`가 정확히 `file` 또는 `upstash`면 그대로, 아니면 자격 증명이 있을 때 Upstash, 없고 `VERCEL`이 설정돼 있으면 에러(`Upstash Redis is not configured: …`), 그 외는 file. 파일 저장소([`kv.ts`](src/lib/db/kv.ts))는 `{kv, sets, lists}` 하나의 JSON 문서를 매 연산마다 읽고 원자적으로(tmp + rename) 다시 쓰므로 여러 프로세스가 공유해도 일관된다. 클라이언트는 모듈 싱글턴이라 모드를 바꾸면 프로세스를 재시작해야 한다. `.data/`는 git-ignored.

**스케줄러 / 체인 모드 조합.**

| | `SCHEDULER=workflow` (기본, 프로덕션) | `SCHEDULER=tick` (e2e, 로컬 fallback) |
| --- | --- | --- |
| 예약 시 | 인보이스마다 durable Workflow run 시작 | 아무 일도 없음 (상태만 기록) |
| 승인 시 | 상태 변경 후 `resumeHook('approve:{id}')` | 상태 변경만 |
| 정산 시점 | run이 `scheduledAt`에 깨어나 정산. 페이롤 런의 인보이스는 병렬 | 브라우저 폴링(3 s)마다 가장 오래된 due 인보이스 1건 → 페이롤이 행 단위로 Confirmed |
| `/api/tick` 역할 | 45 s 이상 지연된 인보이스만 구조 + 출금 완료 | 모든 정산 + 출금 완료 |
| 페이지가 닫혀 있으면 | 그래도 정산됨 | 정산되지 않음 |

`CHAIN_MODE=simulated`(기본)는 어느 스케줄러와도 조합 가능하다. `testnet`은 구현돼 있으나 end-to-end로 검증되지 않았다([AGENTS.md](AGENTS.md) Known gaps).

**배포.** GitHub `KeiaiLab/Settlivo`의 `main`이 Vercel 프로젝트 `settlivo`(https://settlivo.vercel.app)로 자동 배포된다(Vercel 대시보드 설정; 저장소에는 `vercel.json`도 CI 워크플로도 없다). Vercel에서는 파일 저장소가 거부되므로 Upstash Redis 통합(Marketplace)이 연결돼 있어야 한다. 환경 변수는 Vercel env로 관리하며 `.env*.local`, `.vercel/`, `tsconfig.tsbuildinfo`는 커밋하지 않는다. 커밋은 작게, `main`에 바로 push — 행사 중 팀원이 저장소를 실시간으로 따라간다.

## 저장소 구조

[AGENTS.md](AGENTS.md)의 Layout 표를 기준으로 검증한 구조.

| 경로 | 역할 |
| --- | --- |
| [`src/app`](src/app) | 라우트: `(company)/company/*`(dashboard, invoices, approvals, payroll, wallets, billing, workers), `(worker)/worker/*`, `login`, `notifications`, `explorer/tx/[hash]`, `api/{tick,seed,invoices/[id]/approve}`, 루트 `page.tsx`(리다이렉트), `layout.tsx`(dark 테마 + Sonner Toaster), `error.tsx` |
| [`src/proxy.ts`](src/proxy.ts) | 쿠키 없는 `/company/*`, `/worker/*`, `/notifications` 요청을 `/login`으로 307 |
| [`src/lib/domain`](src/lib/domain) | `types.ts`(온톨로지 타입), `ids.ts`(`newId()`), `invoice-status.ts`(상태 머신 `transition`, `badgeStatus`), `membership.ts`, `wallets.ts`, `plan.ts`(구독 플랜 `PLANS`·월 전송 한도 `canSend`·`planFeeUsdc`) |
| [`src/lib/db`](src/lib/db) | 저장소를 만지는 유일한 모듈. `redis.ts`(`getRedis()`: Upstash 또는 파일), `kv.ts`(FileKv), `repo.ts`(API) |
| [`src/lib/fx`](src/lib/fx) | `rates.ts`(live fetch + drift), `fallback.ts`(고정 환율), `convert.ts`(6자리 USDC 변환), `pricing.ts`(spread/fixed) |
| [`src/lib/chain`](src/lib/chain) | `types.ts`(`ChainAdapter`), `index.ts`(`chainMode()`, `getChain()`), `simulated.ts`, `testnet.ts`(viem/Base Sepolia), `memo.ts`(calldata 메모 코덱 + `invoiceHash`) |
| [`src/lib/settlement`](src/lib/settlement) | `settle.ts`(공유 정산 단계), `notify.ts`(유일한 알림 작성기) |
| [`src/lib/scheduler`](src/lib/scheduler) | `index.ts`(`scheduleInvoice`, `approveInvoice`, `retryInvoice`, `schedulerMode()`), `delay.ts` |
| [`src/workflows/invoice.ts`](src/workflows/invoice.ts) | `"use workflow"` durable run (hook → sleep → settle) |
| [`src/lib/seed`](src/lib/seed) | `personas.ts`(고정 ID 페르소나·조직·지갑), `generate.ts`(결정적 이력), `index.ts`(`seedAll`) |
| [`src/lib/actions`](src/lib/actions) | Server Actions(`"use server"` 파일은 async 함수만 export). `session.ts`, `invoices.ts`, `approvals.ts`, `payroll.ts`, `worker.ts`(승인·요청·출금·KYC·페이아웃 설정), `workers.ts`(등록/제거/오프보딩, 링크 요청), `wallets.ts`(조직·워커 지갑, 페이아웃 지갑, 링크 응답), `billing.ts`(`upgradePlan`: 플랜 업그레이드 시뮬레이션, 보류 인보이스 해제) |
| [`src/lib/queries`](src/lib/queries) | 페이지 데이터 로더 `company.ts`(`companyContext`), `worker.ts`(`workerContext`) |
| [`src/lib/session.ts`](src/lib/session.ts), [`src/lib/format.ts`](src/lib/format.ts), [`src/lib/utils.ts`](src/lib/utils.ts) | 세션 쿠키 읽기/역할 가드, 금액·환율·날짜 포맷, `cn()` 클래스 병합 |
| [`src/components/ui`](src/components/ui) | shadcn(base-nova) 프리미티브 + `money.tsx`, `status-badge.tsx`, `local-datetime.tsx`. import되지 않는 파일은 두지 않는다 |
| [`src/components`](src/components) | 앱 컴포넌트: `shell`(header, nav, logo, poller, org switcher, bell, persona badge, page), `invoices`(table, timeline, fx-comparison, sparkline, onchain-record, approve/retry buttons, amount-field), `worker`(kyc-banner, kyc-wizard, withdraw-form), `dashboard`, `payroll`, `approvals`(prefs-diff) |
| [`src/hooks/use-poll.ts`](src/hooks/use-poll.ts) | 3초 폴링 훅 |
| [`e2e/demo.spec.ts`](e2e/demo.spec.ts), [`playwright.config.ts`](playwright.config.ts) | 데모 스크립트 18단계 자동화 |
| [`scripts/seed.ts`](scripts/seed.ts) | `seedAll({flush: true})` CLI |
| [`docs/`](docs) | 아래 [문서 지도](#문서-지도) |

관례(요약, 전체는 [AGENTS.md](AGENTS.md)): 폼은 native `<select>`(shadcn Select 미설치), 일정 선택은 `local-datetime.tsx`가 브라우저에서 ISO 문자열로 제출, 페이지는 단일 렌더를 가정하는 클라이언트 상태를 두지 않음, UI 문구는 영어, 워커 라우트는 375 px에서 사용 가능, shadcn 컴포넌트는 사용하는 커밋에서만 추가.

## 문서 지도

| 문서 | 무엇인가 | 언제 읽나 |
| --- | --- | --- |
| [README.md](README.md) (이 문서) | 허브. 피치, 기능 지도, 아키텍처, 도메인, 라우트, 시드, 실행 방법 | 처음 저장소를 열 때 |
| [docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md) | **설계 스펙 = 동작의 원본(source of truth).** 페르소나, 아키텍처, 데이터 모델, 핵심 흐름 §5.1–5.12, 화면 §6, 시드 §7, 에러 처리 §8, 테스트 §9, 설정 §10 | 동작이 "의도된 것인지" 확인할 때. 동작·라우트·데이터 형태·env·상태를 바꾸면 같은 커밋에서 해당 절을 고친다 |
| [docs/demo-script.md](docs/demo-script.md) | 심사위원용 **5분 클릭 스크립트**(18단계: 기본 13 + 확장 5, 14–18은 온톨로지·구독), 리셋 방법, 직접 실행 명령 | 발표 리허설, 데모 직전 |
| [docs/tutorial.md](docs/tutorial.md) | **10분 핵심 기능 가이드.** 심사 흐름에 맞춰 핵심 기능 7개를 누구로·어디서·무엇을 눌러·무엇이 보여야 하는지만 적음. 나머지는 "더 보기" 표 | 처음 데모를 만져 볼 때, 심사 직전 점검 |
| [docs/roadmap.md](docs/roadmap.md) | **미래 방향(구현되지 않음).** 1단계 구독 과금은 시뮬레이션으로 출시돼 스펙 §5.2 Plans / §6 `/company/billing`으로 옮겨졌고 로드맵에서 지워졌다. 남은 단계: internal 레일 → 온체인 앵커링 → 개인→개인 송금 → Payout Pool(시급·일급 적립 후 워커가 Claim) → 실자금 전환 전제조건 | 다음 단계를 논의할 때. 스펙으로 옮기기 전에는 여기서 구현하지 않는다 |
| [docs/pitch/settlivo-pitch.pdf](docs/pitch/settlivo-pitch.pdf) ([HTML 원본](docs/pitch/settlivo-pitch.html), [render.mjs](docs/pitch/render.mjs)로 PDF 생성, 화면 캡처 `docs/pitch/shots/`) | 심사위원용 2쪽 피치 덱 | 발표 직전 |
| [docs/research/2026-10-24-market-competitive-analysis.md](docs/research/2026-10-24-market-competitive-analysis.md) | 시장·경쟁 분석 (경쟁사, 아시아 고용주·수령자 분석, 오프램프, 권장 사항). `main @ 21214fa` 시점 스냅샷이라 §5의 "환율 위험" 항목은 spread/fixed 도입 이전 기준 | 피치 근거, 포지셔닝 |
| [AGENTS.md](AGENTS.md) | **기여 규칙.** 소스 오브 트루스 순서, 레이아웃, 관례, 죽은 코드·문서 위생 점검, 커밋 전 검증, git 규칙, 깨뜨리면 안 되는 데모 경로 | 코드를 고치기 전 |

문서 간 관계:

- 스펙이 의도된 동작을 기술하고 코드가 그것을 구현한다. **README와 demo-script는 스펙과 일치해야 하며**, 불일치가 생기면 같은 커밋에서 셋을 함께 고친다. 튜토리얼은 코드가 실제로 보여주는 것을 기준으로 쓴다.
- `docs/superpowers/plans/*`는 실행 계획이다. 실행이 끝난 계획은 삭제 대상이며 현재 문서로 취급하지 않는다(현재 `2026-10-24-settlivo-demo-mvp.md` 하나가 남아 있다). 로드맵도 현재 동작이 아니다.
- 스펙 §6의 라우트 목록과 `src/app`의 라우트, `.env.example`과 `process.env.*` 사용, `package.json` 의존성과 import는 양방향으로 일치해야 한다.

## 알려진 한계와 다음 단계

**데모에서 시뮬레이션인 것**

- **인증** — 비밀번호 없는 페르소나 선택. `Sign in with Google`은 페르소나 카드로 스크롤하는 링크일 뿐 OAuth가 없다. `POST /api/invoices/[id]/approve`에는 세션 검사가 없다.
- **KYC/KYB** — 온보딩 위자드는 파일을 업로드하지 않고, 3단계를 지나면 3초 뒤 자동으로 `verified`가 된다. KYB는 조직 레코드의 고정값.
- **온체인 전송** — 기본 `CHAIN_MODE=simulated`. 해시·블록·가스는 생성값이고 잔액은 KV의 `sim:balance:*` 키다. 로그인 화면 하단의 "Demo environment on Base Sepolia"는 testnet 모드를 켰을 때만 사실이며, 인앱 익스플로러는 "Explorer · Base (simulated)"로 표시한다. 메인넷 지원은 없다.
- **오프램프** — 출금은 은행 파트너 없이 8초 뒤 `Completed`로 바뀐다. 수수료 0.5%, 은행 비교표의 `$35 + 2.2% spread`는 고정 상수.
- **이메일** — "Email sent to the counterparty." 토스트만 있고 실제 발송은 없다. 알림은 앱 내 벨/`/notifications`뿐이다.
- **FX** — 환율만 실제 API(open.er-api.com)이며, 실패 시 고정 fallback. 시뮬레이션 정산은 ±0.3% drift를 일부러 넣는다.

**구현됐지만 검증되지 않은 것**

- `CHAIN_MODE=testnet`(viem + Base Sepolia USDC)은 구현돼 있으나 end-to-end로 테스트되지 않았다. USDT는 testnet에서 지원하지 않는다.
- `e2e/`는 로컬 파일 저장소 + `SCHEDULER=tick`에서만 실행된다. 프로덕션(workflow 모드)은 `/login`의 `Reset demo data` 버튼이나 `POST /api/seed`로 리셋한 뒤 수동으로 리허설한다.

**코드에서 알아둘 점**

- 재시도는 `txId`를 확인하지 않고 `chain.transfer`를 다시 호출한다(시뮬레이션이라 이중 지급 문제는 없지만 실자금 전환 전 해결 대상).
- 오프보딩 최종 정산 인보이스는 `rateMode`를 기록하지 않고 항상 spread로 산정된다.
- 출금의 잔액 검사는 `payoutPrefs` 주소를, 화면의 잔액은 기본 Wallet 엔티티 주소를 읽는다. 시드 데이터에서는 둘이 같다.
- tick 모드에서는 페이지가 열려 있어야 정산이 진행된다. 데모 중 탭을 닫지 않는다.

**다음 단계**는 [docs/roadmap.md](docs/roadmap.md)에 있다. 1단계 구독 과금 모델은 시뮬레이션으로 구현됐다(플랜 게이트 + `/company/billing`, 결제는 가짜 카드). 남은 순서: internal 레일 → 온체인 앵커링 → 개인→개인 송금 → Payout Pool(시급·일급 수시 수령) → 실자금 전환 전제조건(실제 KYC/KYB, 라이선스 오프램프, 키 관리). 로드맵의 단계를 구현하려면 먼저 그 단계를 스펙으로 옮기고, 출시되면 로드맵에서 지운다.
