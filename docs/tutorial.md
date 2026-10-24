# Settlivo 튜토리얼 — 데모로 기능 확인하기

이 문서는 **처음 보는 사람이 데모를 열어 기능이 하나씩 실제로 동작하는지 스스로 확인**하기 위한 가이드입니다.
[docs/demo-script.md](demo-script.md)가 발표자가 5분 안에 순서대로 클릭하는 대본이라면, 이 튜토리얼은 기능별로 독립된 절차·기대 결과·내부 동작·문제 해결을 모두 적은 검증 가이드입니다. 제품 소개와 환경 변수 표는 [README.md](../README.md), 의도된 동작의 원본은 [설계 스펙](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md)을 보세요.

- 소요 시간: 전체를 순서대로 따라가면 약 40–60분. 각 섹션(1–16)은 독립적이라 필요한 것만 골라서 확인할 수 있습니다.
- 실행 방법은 두 가지입니다.
  - **프로덕션**: https://settlivo.vercel.app (Upstash Redis, `SCHEDULER=workflow`, `CHAIN_MODE=simulated`)
  - **로컬**: `npm run dev` + JSON 파일 저장소 `.data/kv.json` (Upstash 변수가 없으면 자동 선택). 자세한 내용은 [0. 준비](#0-준비).
- UI 문구는 영어이고 다크 테마입니다. 이 문서에서 따옴표 안의 영문은 화면에 보이는 **정확한 라벨**이므로 그대로 찾으면 됩니다.
- 체인은 기본적으로 시뮬레이션입니다. 실제 자금은 움직이지 않습니다. (로그인 화면 하단의 "Demo environment on Base Sepolia. No real funds move." 문구는 `CHAIN_MODE=testnet`일 때만 정확하고, 기본 모드에서는 인앱 탐색기가 "Explorer · Base (simulated)"로 표시됩니다.)

## 핵심 기능 10분 코스

시간이 없으면 이것만 따라 하세요. 프로덕션 https://settlivo.vercel.app 기준이며, 한 흐름으로 이어집니다. 각 줄 끝의 링크가 상세 절입니다.

| # | 누구로 | 어디서 | 무엇을 | 보여야 하는 것 | 상세 |
| --- | --- | --- | --- | --- | --- |
| 1 | — | `/login` | "Jordan Lee" 클릭 | 회사 대시보드. Treasury balance, Paid in {Month}, "Needs your attention" | [1](#1-로그인과-페르소나), [2](#2-회사-대시보드) |
| 2 | Jordan | "New invoice" | Worker "Alice Kim · KR · KRW", Amount `4200000`, Rate "Spread…", Memo `October salary` → "Issue invoice" | 상세 페이지 배지 "Awaiting approval", FX 카드에 견적 환율과 수수료 | [3](#3-인보이스-발행-fx-spread--fixed) |
| 3 | Alice | 로그아웃 → "Alice Kim" → `/worker` | "Needs your approval (1)" 카드의 "Approve" | 토스트 "Approved" + "Email sent to the counterparty.", "Upcoming"에 예약 시각 | [4](#4-워커-승인과-예약-정산) |
| 4 | Alice | 인보이스 상세를 열어 둠 | 약 2분 대기 (3초마다 자동 갱신) | 배지 "Scheduled" → "Sending" → "Confirmed", 알림 "You received … USDC" | [4](#4-워커-승인과-예약-정산) |
| 5 | Alice | 같은 페이지 | "On-chain record"의 "Tx hash" 클릭 | 헤더 "Verified", 탐색기의 "Decoded Settlivo memo"에 인보이스 ID와 해시 | [5](#5-fx-비교와-온체인-기록-검증) |
| 6 | Alice | "Withdraw to KRW" | Amount `100` → "Withdraw to KRW" | 비교표(Settlivo vs Bank wire), History "Processing" → 약 8초 뒤 "Completed", 잔액 감소 | [6](#6-출금-오프램프) |
| 7 | Jordan | 로그아웃 → "Jordan Lee" → "Approvals" | Bob의 설정 변경 "Approve", Carlos의 결제 요청 "Approve & schedule" | diff 뷰, 요청 건이 "Scheduled"로 | [7](#7-페이아웃-설정-변경과-회사-승인), [8](#8-워커-결제-요청) |
| 8 | Jordan | "Payroll" | "Run payroll now" | 런 페이지 "Settled 0 / 3" → 행이 하나씩 "Confirmed" → "3 / 3", 배지 "Completed" | [9](#9-페이롤-런) |
| 9 | Jordan → Eun → Jordan | "Invoices"의 "Blocked · KYC" 행 | Eun으로 로그인해 "Continue" → 3단계 완료 → Jordan으로 돌아와 "Retry settlement" | "Reviewing your documents…" 3초 → 배너 사라짐, 재시도 후 "Confirmed" | [10](#10-kyc-차단과-재시도) |
| 10 | Jordan | 헤더 조직 선택 → "Nordwind Labs" | "Billing" → "Payroll" → "Run payroll now" → "Upgrade to Business" | Free 3/3 소진이라 행이 "Blocked · Plan", 업그레이드 즉시 "Confirmed"로 재개 | [12](#12-조직-전환), [12b](#12b-구독-플랜과-billing) |

데이터를 되돌리려면 [17. API와 데이터 리셋](#17-api와-데이터-리셋)의 `POST /api/seed`를 호출합니다.

목차

- [핵심 기능 10분 코스](#핵심-기능-10분-코스)
- [0. 준비](#0-준비)
- [1. 로그인과 페르소나](#1-로그인과-페르소나)
- [2. 회사 대시보드](#2-회사-대시보드)
- [3. 인보이스 발행 (FX spread / fixed)](#3-인보이스-발행-fx-spread--fixed)
- [4. 워커 승인과 예약 정산](#4-워커-승인과-예약-정산)
- [5. FX 비교와 온체인 기록 검증](#5-fx-비교와-온체인-기록-검증)
- [6. 출금 (오프램프)](#6-출금-오프램프)
- [7. 페이아웃 설정 변경과 회사 승인](#7-페이아웃-설정-변경과-회사-승인)
- [8. 워커 결제 요청](#8-워커-결제-요청)
- [9. 페이롤 런](#9-페이롤-런)
- [10. KYC 차단과 재시도](#10-kyc-차단과-재시도)
- [11. 알림](#11-알림)
- [12. 조직 전환](#12-조직-전환)
- [12b. 구독 플랜과 Billing](#12b-구독-플랜과-billing)
- [13. 워커 등록·제거·오프보딩](#13-워커-등록제거오프보딩)
- [14. 조직 지갑](#14-조직-지갑)
- [15. 워커 지갑과 링크 요청](#15-워커-지갑과-링크-요청)
- [16. 실패 처리와 안전장치](#16-실패-처리와-안전장치)
- [17. API와 데이터 리셋](#17-api와-데이터-리셋)
- [18. 자동 검증 (테스트·E2E)](#18-자동-검증-테스트e2e)
- [19. 전체 체크리스트](#19-전체-체크리스트)

---

## 0. 준비

### 프로덕션 vs 로컬

| | 프로덕션 | 로컬 |
| --- | --- | --- |
| URL | https://settlivo.vercel.app | http://localhost:3000 |
| 저장소 | Upstash Redis | `.data/kv.json` (JSON 파일, `KV_FILE`로 경로 변경 가능) |
| 스케줄러 | `SCHEDULER=workflow` (기본) | 기본은 `workflow`. 가장 단순한 확인은 `.env.local`에 `SCHEDULER=tick` |
| 체인 | `CHAIN_MODE=simulated` | 동일 (`testnet`은 구현되어 있으나 E2E 미검증) |
| 데이터 리셋 | `POST /api/seed` + `x-seed-secret` 헤더 | `npm run seed` |

로컬 실행:

```bash
npm install
cp .env.example .env.local   # 선택: Upstash 변수가 비어 있으면 파일 저장소를 사용
npm run seed                 # 저장소를 비우고(flush) 데모 데이터를 넣음
npm run dev                  # 콘솔에 "[settlivo] Using local file KV store at <path>" 가 찍힘
```

스케줄러 모드 차이(두 모드 모두 정산 로직은 같은 `settleInvoice`를 사용):

- `workflow`: 인보이스마다 Vercel Workflow 내구 실행(run) 하나가 시작되어 `scheduledAt`에 정확히 정산합니다. `/api/tick`은 **45초 이상 지연된** 인보이스만 구조하는 안전망으로 동작합니다.
- `tick`: 예약 시점에는 아무 일도 하지 않고, 열려 있는 페이지가 3초마다 `GET /api/tick`을 호출할 때 **가장 오래된 due 인보이스 하나**를 정산합니다. 브라우저 탭이 하나도 열려 있지 않으면 아무것도 정산되지 않습니다.

### 데이터 리셋

프로덕션(헤더 `x-seed-secret`가 `SEED_SECRET`과 같아야 하며, 아니면 401):

```bash
curl -X POST https://settlivo.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'
```

로컬: `npm run seed` (항상 flush). `npm run seed`의 콘솔 출력은 `{"orgs":2,"wallets":12,"linkRequests":1,"workers":6,"invoices":25,"txs":23,"payrollRuns":2,"withdrawals":3,"notifications":27,"fxHistory":31}`이고, `POST /api/seed`의 HTTP 응답은 같은 값을 `counts`로 한 번 감싼 `{"counts":{"orgs":2,…}}`입니다. 요청/응답 형태는 [17. API와 데이터 리셋](#17-api와-데이터-리셋) 참고.

### 리셋 직후 상태 (페르소나별 대기 항목)

| 페르소나 | 역할 | 리셋 직후 보이는 것 |
| --- | --- | --- |
| Jordan Lee | Finance Lead · Acme Remote (Acme + Nordwind 두 조직 관리) | 대시보드 "Needs your attention"에 3건: "Eun Nguyen · KYC pending", "Bob Reyes changed payout settings", "Carlos Mendes requested payment". 알림 12건(미읽음 7). Treasury 48,250 USDC + Operations 12,500 USDC. 과거 페이롤 런 2건. Acme 플랜 **Business**(무제한 전송, 이달 6건 전송, 11/12 갱신) → `/company/billing` "Current plan" "Business". |
| Mia Schulz | People Ops · Nordwind Labs | 대기 항목 없음. 알림 1건(읽음). Treasury 21,900 USDC + EUR operations 4,200 USDC. "Former workers (1)"에 Finn Larsen. Nordwind 플랜 **Free**(월 3건 한도, 3/3 소진, 11/1 갱신) → 리셋 직후 Nordwind에서 새 정산을 돌리면 "Blocked · Plan"으로 보류되며 `/company/billing`에서 업그레이드해야 정산됩니다([12b](#12b-구독-플랜과-billing)). |
| Alice Kim | KR · KRW · Verified (Acme + Nordwind 소속) | 잔액 2,400 USDC. 지갑 "Settlivo wallet"(Payout wallet)과 "Ledger (cold)". 은행 KB Kookmin ****2841. Nordwind 급여는 fixed 모드라 목록에 "Fixed" 배지. |
| Bob Reyes | PH · PHP · Verified | 잔액 1,320.50 USDT(외부 지갑 "MetaMask"가 기본). Settlivo wallet(플랫폼 주소 0xb0b0…)에는 420 USDC가 따로 있음. 페이아웃 설정 변경이 회사 승인 대기 중(→ Settlivo wallet, USDC). Acme의 지갑 링크 요청 1건 대기. 은행 BDO Unibank ****7730. |
| Carlos Mendes | BR · BRL · Verified | 잔액 860 USDC. 본인이 보낸 결제 요청 1건 "Overtime: release weekend" R$2,400 (status Awaiting approval, 내일 09:24 UTC = KST 18:24 예정; 분은 PRNG에서 나와 정각이 아님). 은행 Nubank ****1190. |
| Dana Kowalski | PL · PLN · Verified (Nordwind) | 잔액 1,975.25 USDC. 은행 mBank ****5522. |
| Eun Nguyen | VN · VND · KYC pending | 잔액 0. KYC 배너 "1 of 3 steps complete". "Upcoming"에 Acme Remote ₫38,000,000 "On hold until verified". 은행 계좌 없음(출금 불가). |

Finn Larsen(오프보딩된 전 직원)은 로그인 목록에 나오지 않습니다.

### 알아둘 것

- 모든 페이지는 헤더의 Poller가 **3초마다** `/api/tick`을 호출한 뒤 서버 컴포넌트를 다시 렌더링합니다. 상태 변화를 보려고 수동 새로고침을 할 필요가 없습니다.
- 날짜·시간은 `DEMO_TIMEZONE`(기본 `Asia/Seoul`) 기준으로 "Oct 24, 02:05 PM" 형식으로 표시됩니다.
- 금액: 현지 통화는 좁은 기호(₩, ₱, R$, zł, ₫), KRW/VND는 소수점 없음. USDC는 화면에서 2자리, 툴팁에 6자리 전체 값.
- 환율: 라이브 FX 조회가 실패하면 고정 fallback(KRW 1385.2, PHP 58.4, BRL 5.42, PLN 3.98, VND 25310, EUR 0.921)을 쓰며, 로그인 화면은 "Reference rates per USD", 워커 홈은 "· fallback rate"로 표시합니다. 리셋 직후 캐시는 `fallback`으로 저장되지만 다음 사용 시 라이브 조회를 다시 시도합니다.
- 폼 액션에서 서버가 Error를 던지면 전체 페이지가 "That didn't go through" 화면(메시지 + "Try again" / "Go back")으로 바뀝니다. 인라인 에러가 아닙니다. 로컬 `npm run dev`에서는 서버가 던진 Error 메시지가 그대로 보이지만, 프로덕션 빌드(Vercel)에서는 Next.js가 메시지를 digest로 대체하므로 항상 공통 문구 "The server declined the request, for example a missing wallet address or an unreachable service. Try again or go back."가 표시됩니다(`src/app/error.tsx`). 아래 각 섹션의 구체 메시지("Select at least one worker" 등)는 로컬 기준입니다.
- 토스트는 Approve/Reject("Approved" / "Rejected" + "Email sent to the counterparty.")와 Retry("Settlement restarted")에만 있습니다. 나머지 폼은 토스트 없이 리다이렉트/재렌더링됩니다.
- 워커 화면은 375px 폭에서도 쓸 수 있습니다. 좁은 화면에서는 네비게이션이 헤더 아래 두 번째 줄로 내려옵니다.

---

## 1. 로그인과 페르소나

### 목적

비밀번호 없는 페르소나 선택 로그인, 역할별 홈 리다이렉트, 세션 쿠키 가드가 동작하는지 확인합니다.

### 사전 조건

로그아웃 상태(또는 시크릿 창). 리셋 여부와 무관.

### 단계

1. `/login`을 엽니다. (로그인 없이 `/company`, `/worker`, `/notifications`를 열면 307으로 `/login`에 옵니다. `/`는 세션이 있으면 홈으로, 없으면 `/login`으로.)
2. 왼쪽 히어로를 확인: 제목 "Payroll that crosses borders in minutes.", 샘플 "Settlement receipt" 카드("Verified on-chain"), 통화별 환율 목록("Live rates per USD" 또는 "Reference rates per USD").
3. 오른쪽 "Sign in" 패널: "Choose a demo account. No password needed." 아래 "Sign in with Google" 버튼을 누르면 OAuth가 아니라 페이지 내 `#accounts`로 스크롤만 됩니다.
4. "Company admins" 카드에서 "Jordan Lee"(Finance Lead · Acme Remote) 행을 클릭.
5. `/company`에 도착하면 헤더 오른쪽 "Finance Lead · Acme Remote" 옆 아이콘 버튼(aria-label "Sign out")으로 로그아웃.
6. "Workers" 카드에서 "Alice Kim"(KR · KRW · Verified)을 클릭 → `/worker`.
7. 워커로 로그인한 채 주소창에 `/company`를 입력해 봅니다.

### 기대 결과

- [ ] 로그인 목록: Company admins = Jordan Lee, Mia Schulz / Workers = Alice Kim, Bob Reyes, Carlos Mendes, Dana Kowalski, Eun Nguyen(각각 국기 이모지 + "{country} · {currency} · Verified|KYC pending"). Finn Larsen은 없음.
- [ ] Jordan 클릭 → `/company`, 헤더 로고 "Settlivo", 네비 "Dashboard | Invoices | Payroll | Wallets | Billing | Workers | Approvals", 조직 `<select>`(aria-label "Organization")에 "Acme Remote | Nordwind Labs".
- [ ] Alice 클릭 → `/worker`, 제목 "Hi, Alice", 설명 "KR · paid in USDC · shown in KRW", 네비 "Home / Request payment / Withdraw / Settings".
- [ ] 워커 세션으로 `/company` 접근 → `/login`을 거쳐 `/worker`로 돌아옴(반대도 동일).
- [ ] 브라우저 탭 제목 "Settlivo — Global stablecoin payroll".

### 내부 동작

각 페르소나 행은 hidden `persona` 입력을 가진 `<form action={loginAs}>`입니다. `loginAs`([src/lib/actions/session.ts](../src/lib/actions/session.ts))가 `PERSONAS`([src/lib/seed/personas.ts](../src/lib/seed/personas.ts))에서 찾아 JSON 쿠키 `settlivo_session`(httpOnly, sameSite lax, 7일; `{personaId, role, name, orgIds, orgId?, workerId?}`)을 쓰고 `/company` 또는 `/worker`로 리다이렉트합니다. 회사 페르소나의 `orgId`는 `orgIds`의 첫 번째(Jordan → Acme). [src/proxy.ts](../src/proxy.ts)는 쿠키 없는 `/company/*`, `/worker/*`, `/notifications` 요청을 `/login`으로 보내고, `requireCompany()` / `requireWorker()`([src/lib/session.ts](../src/lib/session.ts))가 역할 불일치를 걸러냅니다. 스펙 [§2](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#2-users-and-personas).

### 문제가 있다면

- 페르소나 목록이 비어 있거나 "Organization not found / Seed the database first."가 보이면 데이터가 없는 것입니다 → [0. 준비](#0-준비)의 리셋.
- 로그인 후 바로 `/login`으로 튕기면 쿠키가 차단된 브라우저인지 확인하세요.
- 환율이 "Reference rates per USD"면 FX API 조회가 실패해 fallback을 쓰는 상태이며 기능 검증에는 영향이 없습니다.

---

## 2. 회사 대시보드

### 목적

조직 요약(잔액·이달 지급·진행 중·워커 수), 은행 송금 대비 절감 위젯, 대기 항목 카드가 시드 데이터와 일치하는지 확인합니다.

### 사전 조건

리셋 완료. Jordan Lee로 로그인(활성 조직 Acme Remote).

### 단계

1. `/company`(네비 "Dashboard")를 엽니다.
2. 제목과 설명 줄, 오른쪽 상단 버튼 "Run payroll", "New invoice"를 확인합니다.
3. 네 개의 통계 카드를 읽습니다.
4. "Recent invoices" 카드의 "View all" 링크로 `/company/invoices`에 갔다가 돌아옵니다.
5. "Saved vs. bank wires · {Month}" 위젯과 "Needs your attention" 카드를 확인합니다.
6. "Needs your attention"의 각 행을 클릭해 이동 대상을 확인합니다.

### 기대 결과

- [ ] 제목 "Acme Remote", 설명 "US · KYB verified · treasury 0x5e77a1b2…".
- [ ] 카드: "Treasury balance" = 60,750.00 USDC(Treasury 48,250 + Operations 12,500), 힌트 "2 wallets · Base"(숫자는 `/company/wallets` 링크); "Paid in {Month}"(이달 UTC 기준 confirmed 합계, 힌트 "{n} settlements"); "In flight" = scheduled/sending 건수(리셋 직후 1 = Eun의 차단 인보이스), 힌트 "scheduled or settling"; "Workers" = 4, 힌트 "3 verified".
- [ ] "Recent invoices": 최근 8건, 컬럼 Worker / Memo / Amount / Scheduled / Status(compact라 Stablecoin 컬럼 없음).
- [ ] 절감 위젯: "Fees saved", "Days saved"(정산 건수 × 4), "Avg. settlement" "~10 min", 각주 "Bank baseline: $35 + 2.2% FX spread, 4 business days. Settlivo: 0.5%. On a paid plan, per-transfer fees are 0."
- [ ] "Needs your attention" + 링크 "Approvals (2)": "Eun Nguyen · KYC pending"(배지 "Blocked · KYC", → 인보이스 상세), "Bob Reyes changed payout settings"(배지 "Pending", → `/company/approvals`), "Carlos Mendes requested payment"(배지 "Awaiting approval", → `/company/approvals`).

### 내부 동작

`src/app/(company)/company/page.tsx`가 `companyContext(orgId)`([src/lib/queries/company.ts](../src/lib/queries/company.ts))로 조직·워커·인보이스·지갑을 읽고, 지갑 잔액은 `chain.getBalance`(시뮬레이션 키 `sim:balance:{address}:{TOKEN}`)로 합산합니다. "Paid in {Month}"는 confirmed 인보이스 중 마지막 history 항목이 이번 달(UTC)인 것의 `usdcAmount` 합. 절감 위젯 상수는 [src/components/dashboard/savings-widget.tsx](../src/components/dashboard/savings-widget.tsx)(BANK_FIXED_FEE_USD 35, BANK_FX_SPREAD 0.022, BANK_DAYS 4, SETTLIVO_FEE 0.005). 스펙 [§6](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens). 참고: 스펙 §6은 대시보드에 워커 테이블이 있다고 하지만 코드에는 "Workers" 통계 카드만 있고 테이블은 `/company/workers`에 있습니다. KYB는 카드가 아니라 설명 줄의 "KYB verified" 텍스트입니다.

### 문제가 있다면

- "Needs your attention"에 3건이 아니면 이미 누군가 처리한 상태입니다 → 리셋.
- "Nothing pending."은 모든 대기 항목이 처리됐다는 뜻이지 오류가 아닙니다.
- "Paid in {Month}"가 0이면 이달(UTC) confirmed 인보이스가 없는 것입니다. 시드는 Acme 급여를 4일 전에 넣으므로 월초 1–4일에 리셋하면 전월 건이 될 수 있습니다.

---

## 3. 인보이스 발행 (FX spread / fixed)

### 목적

회사가 현지 통화 금액으로 인보이스를 발행하고, 요율 모드(spread / fixed)에 따라 USDC 미리보기와 수수료가 달라지는지, 발행 직후 상태가 "Awaiting approval"인지 확인합니다.

### 사전 조건

Jordan Lee로 로그인(Acme Remote). Alice Kim이 KYC verified 상태(시드 기본).

### 단계

1. `/company/invoices/new`(대시보드의 "New invoice" 또는 `/company/invoices`의 "New invoice").
2. "Worker" select에서 "Alice Kim · KR · KRW"를 선택합니다(미검증 워커는 " · KYC pending"이 붙음).
3. "Amount (local currency)"에 `4200000`, "Currency" `KRW`.
4. "Rate" select: 기본 "Spread · market rate at send · 0.5% fee". 한 번 "Fixed · lock today's rate for 24 h · 1.1% fee"로 바꿔 미리보기 문구 변화를 본 뒤 원하는 쪽을 선택합니다.
5. "Settle at": 기본값은 지금 + 2분(힌트 "Default is two minutes from now so you can watch it settle."). 그대로 둡니다.
6. "Memo": 기본 "Monthly salary" → `October salary`로 변경.
7. 안내 상자 "Indicative rates ({source}): {rate} KRW/USD · … The final USDC amount is fixed at send time."를 확인하고 "Issue invoice" 클릭.

### 기대 결과

- [ ] Spread 미리보기: "₩4,200,000 ≈ {usdc} USDC at today's indicative {rate} KRW/USD; final rate locked at send · fee {fee} USDC (0.5%)".
- [ ] Fixed 미리보기: "₩4,200,000 = {usdc} USDC locked at {rate} for 24 h · fee {fee} USDC (1.1%)". 금액을 지우면 "Enter an amount to see the stablecoin equivalent."
- [ ] 미리보기의 수수료(0.5% / 1.1%)는 건별 요율이며 플랜을 반영하지 않습니다. 실제 `feeUsdc`는 정산 시 보내는 조직의 플랜으로 계산되어 Acme(Business)는 spread 0.00 USDC, fixed는 0.6%(프리미엄만)가 부과됩니다. Free 조직(Nordwind)만 0.5% / 1.1% 전액을 냅니다([12b](#12b-구독-플랜과-billing)).
- [ ] 제출 후 `/company/invoices/inv_…`로 리다이렉트(토스트 없음). 제목 "October salary", 설명 "Alice Kim · ₩4,200,000 · settle {datetime}", 헤더 배지 "Awaiting approval".
- [ ] "Timeline" 카드: "Issued"가 현재 단계(시계 아이콘, 아래 "{datetime} · org_acme"), "Approved & scheduled" 이하 세 단계는 빈 원. 승인 후에야 "Issued"가 초록 체크로 바뀌고 "Approved & scheduled"가 현재 단계가 됩니다.
- [ ] "FX & settlement amount" 카드: spread면 설명 "Rate is locked at send time, not at invoice time.", "Pricing" "Spread · 0.5% fee"; fixed면 "Fixed · 1.1% fee, locked {rate} until {datetime}". "Executed rate (at send)" = "pending", "Settled amount" = "—".
- [ ] "On-chain record" 카드: "Appears once settlement starts."
- [ ] "Details": "Initiated by" "Company"(값은 `company`지만 `capitalize`로 표시), "Worker" 링크, "Payout to" 주소 + "(USDC)".
- [ ] `/company/invoices`에서 필터 "Open"에 새 인보이스가 보임(fixed면 Memo 옆 작은 "Fixed" 배지). 회사 쪽 Approve 버튼은 없음(회사 발행 건은 워커가 승인).

### 내부 동작

`createInvoice`([src/lib/actions/invoices.ts](../src/lib/actions/invoices.ts))가 워커 소속·금액·통화·일시를 검증하고 `priceAtIssue(rateMode)`([src/lib/fx/pricing.ts](../src/lib/fx/pricing.ts))로 `rateMode/feeBps`(spread 50 bps, fixed 110 bps + `lockedRate`, `lockExpiresAt = scheduledAt + 24 h`; `feeBps`는 표시용 건별 요율이고 실제 청구액 `feeUsdc`는 정산 시 `planFeeUsdc(plan.tier, mode, usdc)`로 계산)를 정한 뒤 `status: pending_approval`, `initiatedBy: company`, `quoteRate`, `invoiceHash`(sha256)로 저장합니다. 워커에게 `invoice_created` 알림("New invoice from Acme Remote: ₩4,200,000" / "October salary · scheduled {datetime}. Approve to receive it.")을 보내고 `scheduleInvoice`(workflow 모드면 `start(invoiceWorkflow)`, 승인 훅 `approve:{id}` 대기)를 호출합니다. 환율은 `currentRates()`(캐시가 live이고 10분 이내면 재사용). 미리보기는 클라이언트 `estimateUsdc`([src/components/invoices/amount-field.tsx](../src/components/invoices/amount-field.tsx)). 스펙 [§5.1](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout), [§5.2](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed).

### 문제가 있다면

- "That didn't go through" + "Worker not in organization" / "Amount must be positive" / "Invalid schedule time": 입력값을 확인하고 "Go back".
- 미리보기가 안 바뀌면 JS가 아직 로드되지 않은 것(서버 렌더 직후). 잠깐 기다린 뒤 금액을 다시 입력.
- 안내 상자의 source가 `fallback`이면 고정 환율을 쓰는 상태입니다. 최종 USDC는 정산 시점 환율로 계산되므로 검증에는 지장이 없습니다.

---

## 4. 워커 승인과 예약 정산

### 목적

워커가 홈에서 인보이스를 승인하면 예약 시각에 자동으로 정산되고(Scheduled → Sending → Confirmed), 양쪽에 알림이 가는지 확인합니다.

### 사전 조건

[3. 인보이스 발행](#3-인보이스-발행-fx-spread--fixed)에서 Alice 앞으로 인보이스를 발행한 직후(예약 시각 = 발행 + 2분). 휴대폰으로 해도 됩니다.

### 단계

1. 로그아웃 → "Alice Kim"으로 로그인 → `/worker`.
2. "Needs your approval (1)" 섹션의 카드: 제목 "Acme Remote · ₩4,200,000", 설명 "October salary · settles {datetime} · ≈ {usdc} USDC at today's rate".
3. "Approve" 클릭. (거절을 보려면 "Reject" → "Reason" 입력 → "Confirm reject" 또는 "Cancel".)
4. 헤더 종 아이콘(aria-label "Notifications")에서 알림을 확인한 뒤 알림 링크로 `/worker/invoices/{id}`를 엽니다.
5. 페이지를 열어 둔 채 기다립니다(3초마다 자동 갱신).

### 기대 결과

- [ ] 클릭 즉시 토스트(우상단) "Approved" + "Email sent to the counterparty."; 카드가 사라짐.
- [ ] `/worker` "Upcoming" 카드에 "Acme Remote ₩4,200,000"와 예약 시각이 뜸.
- [ ] 인보이스 상세: 헤더 배지 "Scheduled"; "Timeline"의 "Approved & scheduled"에 "{datetime} · wrk_alice".
- [ ] 예약 시각 도달 → 배지 "Sending"(보라색, 깜빡임), Upcoming에 "Settling now…", 타임라인 "Settling on-chain" · "settlement".
- [ ] 2–5초 뒤(`SIM_CONFIRM_MS` 기본) 배지 "Confirmed"; "Recent payouts" 카드에 추가됨.
- [ ] 워커 알림 "You received {usdc} USDC" / "₩4,200,000 settled on-chain at {rate} KRW/USD."; 회사(Jordan) 알림 "Invoice approved: ₩4,200,000" / "Alice Kim's invoice is scheduled for {datetime}."와 "Settled {usdc} USDC to Alice Kim" / "₩4,200,000 confirmed on-chain.".
- [ ] 워커 홈 "Available balance"가 2,400 USDC에서 정산액만큼 증가.
- [ ] 거절한 경우: 배지 "Rejected", 타임라인에 빨간 "Rejected" 행 + 사유, 회사 알림 "Invoice rejected: ₩4,200,000" / "Reason: …".

### 내부 동작

`approveMyInvoice` → `approveInvoice(id, "worker:wrk_alice", approved, reason)`([src/lib/scheduler/index.ts](../src/lib/scheduler/index.ts)). `pending_approval`일 때만 동작(멱등)하며 `scheduled` 또는 `rejected`로 전이하고 상대방에게 알림을 보냅니다. workflow 모드에서는 훅 `approve:{id}`를 500 ms 간격 최대 6회 `resumeHook`하고, 실패하면(그리고 승인인 경우에만) 새 run을 시작합니다. 거절은 run을 새로 띄우지 않습니다. run은 `sleep(scheduledAt)` 후 `settleInvoice`([src/lib/settlement/settle.ts](../src/lib/settlement/settle.ts))를 호출: KYC 확인(미검증이면 `blockedReason: "kyc"`) → 플랜 확인(`currentPlan(org.plan)` + `canSend`; Free는 월 3건이며 한도 초과면 `blockedReason: "plan"` + 조직 알림 `invoice_blocked_plan`("Monthly send limit reached (3 on Free)", → `/company/billing`), status `scheduled` 유지, 전송 없음) → `sending` → 환율 조회(시뮬레이션 모드는 ±0.3% drift) → `priceAtSettlement` + `planFeeUsdc`(플랜별 수수료) → 워커 기본 지갑으로 `chain.transfer`(calldata에 `SETTLIVO|{invoiceId}|{sha256}` 메모) → `waitForConfirmation`(2–5초, 블록 21,400,000 + 카운터) → `confirmed` → 조직 `plan.sendsThisMonth += 1`(Free의 마지막 건이면 알림 "Last free send of the month used" / "The next payout will wait until you upgrade or the month renews.") → 양쪽 `invoice_settled` 알림. tick 모드에서는 열린 페이지의 3초 폴링이 `GET /api/tick`을 부르고 거기서 가장 오래된 due 인보이스 하나를 정산합니다. 상태 머신은 [src/lib/domain/invoice-status.ts](../src/lib/domain/invoice-status.ts). 스펙 [§5.1](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#51-scenario-1--company-invoice--worker-approval--scheduled-payout), [§5.4](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#54-settlement-step-shared-by-both-scheduler-engines).

### 문제가 있다면

- 예약 시각이 지났는데 "Scheduled"에 머무름: workflow 모드에서는 `/api/tick` 안전망이 **45초 이상** 지연된 건을 정산하므로 최대 ~50초 더 기다리세요(페이지가 열려 있어야 폴링됨). tick 모드에서는 탭을 열어 두어야 합니다.
- 여러 건이 동시에 due면 tick은 한 번에 하나씩(약 3초 간격) 처리합니다.
- "Needs your approval"에 카드가 없으면 인보이스가 Alice 앞으로 발행되지 않았거나 이미 승인된 것입니다. `/worker` "Upcoming"을 확인.
- 배지가 "Failed"가 되면 [16. 실패 처리와 안전장치](#16-실패-처리와-안전장치)의 Retry.

---

## 5. FX 비교와 온체인 기록 검증

### 목적

정산된 인보이스에서 견적 환율 vs 실행 환율, 적용 환율, 수수료가 표시되고, 트랜잭션 calldata에 박힌 인보이스 ID·해시가 저장된 인보이스와 일치해 "Verified"로 검증되는지 확인합니다.

### 사전 조건

[4](#4-워커-승인과-예약-정산)에서 Confirmed가 된 인보이스. Alice(워커) 또는 Jordan(회사) 어느 쪽에서든 가능. 시드의 과거 confirmed 인보이스로도 확인할 수 있습니다.

### 단계

1. 인보이스 상세(`/worker/invoices/{id}` 또는 `/company/invoices/{id}`)를 엽니다.
2. "FX & settlement amount" 카드의 행을 읽습니다.
3. "On-chain record" 카드의 헤더 상태와 "Tx hash" 링크(0x…로 시작)를 클릭 → `/explorer/tx/0x…`.
4. 탐색기에서 "Transaction details"와 "Input data" 카드를 확인하고 "Back to app"으로 돌아옵니다.
5. (회사 측) "Details" 카드의 "Invoice ID"를 메모해 두고 탐색기 "Decoded Settlivo memo"의 "Invoice"와 비교합니다.

### 기대 결과

- [ ] FX 카드 행: "Pricing"("Spread · 0.5% fee" 또는 "Fixed · 1.1% fee, locked {rate} until {datetime}"), "Quote rate (at issue)", "Executed rate (at send)"(더 이상 "pending" 아님), "Change"(±x.xxx%, 0 이하 초록 / 양수 빨강), "Applied rate"(fixed 잠금 만료 시 " (lock expired, market rate used)"), "Fee", "Settled amount"(USDC). 오른쪽 "30-day KRW/USD" 스파크라인.
- [ ] "Fee"는 플랜 기준 실제 청구액(`feeUsdc`)입니다: Free 플랜은 0.5% / 1.1%, Pro·Business는 spread 0 USDC / fixed 0.6%(프리미엄만). Acme는 Business라 이 튜토리얼에서 정산한 spread 건은 "Fee" "0.00 USDC"로 보이며, 같은 카드의 "Pricing" 행 "Spread · 0.5% fee" 표기(`feeBps`, Free 기준)와 다른 것이 정상입니다. 시드의 과거 confirmed 인보이스는 플랜 없이 생성되어 0.5% / 1.1%가 찍혀 있습니다.
- [ ] Fixed 인보이스는 "Applied rate" = 잠금 환율(견적과 동일), Spread는 "Applied rate" = "Executed rate".
- [ ] On-chain record 헤더: 초록 방패 "Verified"; 설명 "Invoice ID and SHA-256 hash are embedded in the transfer calldata."; 행 "Tx hash"(축약 링크), "Status" "Confirmed · block 21,400,0xx"(`capitalize` 표시), "Memo" "SETTLIVO|inv_…|{hash 축약}", "Invoice hash"(64자리 hex).
- [ ] 탐색기: 상단 알약 "Explorer · Base (simulated)", 배지 "Confirmed", 행 "Transaction hash", "Block", "Timestamp", "From" "{addr} (Settlivo treasury)"(= 0x5e77a1b2…), "To"(워커 지갑), "Token transfer" "{amount} USDC → ERC-20 transfer via USDC contract", "Gas used" "{n} · ~$0.002", "Method" "transfer(address,uint256) + memo".
- [ ] "Input data": raw calldata(`0xa9059cbb`로 시작) + 초록 "Decoded Settlivo memo" 상자("Invoice" 링크, "Invoice hash"). 링크는 세션 역할에 따라 `/worker/invoices/{id}` 또는 `/company/invoices/{id}`.
- [ ] 탐색기는 로그인 없이도 열립니다.

### 내부 동작

`invoiceHash` = `{id, orgId, workerId, amount, currency, scheduledAt, memo, rateMode ?? "spread", lockedRate ?? null}`의 고정 키 순서 JSON sha256([src/lib/chain/memo.ts](../src/lib/chain/memo.ts)). `buildTransferCalldata`는 viem `transfer(to, amount)`(68바이트) 뒤에 UTF-8 `SETTLIVO|{invoiceId}|{hash}`를 붙입니다. `OnchainRecord`([src/components/invoices/onchain-record.tsx](../src/components/invoices/onchain-record.tsx))는 `getTx(inv.txId)`로 저장된 tx를 읽어 `decodeMemo(calldata)`한 뒤 `memo.invoiceId === invoice.id && memo.invoiceHash === invoiceHash(invoice)`이면 "Verified", 아니면 "Mismatch". 시뮬레이션 어댑터([src/lib/chain/simulated.ts](../src/lib/chain/simulated.ts))는 32바이트 랜덤 해시, `explorerUrl = /explorer/tx/{hash}`, 확인 시 수신자 잔액 증가·송신자 잔액 감소. `executedRate`는 송금 시점 시장 환율, `appliedRate`는 실제 USDC 계산에 쓴 환율(fixed 잠금 중이면 `lockedRate`). 스펙 [§5.2](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed), [§5.6](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#56-on-chain-invoice-record).

### 문제가 있다면

- "Appears once settlement starts."만 보이면 아직 `sending` 이전입니다 → [4](#4-워커-승인과-예약-정산)의 대기 안내.
- "Mismatch"가 보이면 저장된 인보이스의 해시 필드(금액·메모·예약시각·rateMode·lockedRate)가 송금 후 바뀐 것입니다. 정상 흐름에서는 발생하지 않습니다(Retry도 `scheduledAt`을 바꾸지 않음).
- 탐색기가 404면 해시가 저장소에 없는 것입니다(리셋 후 옛 링크 등).
- `CHAIN_MODE=testnet`이면 탐색기 링크가 `https://sepolia.basescan.org/tx/{hash}`로 리다이렉트됩니다.

---

## 6. 출금 (오프램프)

### 목적

워커가 USDC 잔액을 현지 통화로 출금하면 은행 송금 비교표가 보이고, 상태가 Processing → Completed로 바뀌며 잔액이 줄어드는지 확인합니다.

### 사전 조건

Alice Kim으로 로그인(은행 KB Kookmin ****2841 보유, 잔액 ≥ 100 USDC). 휴대폰 가능.

### 단계

1. `/worker/withdraw`(홈의 "Withdraw to KRW" 버튼 또는 네비 "Withdraw").
2. "New withdrawal" 카드의 "Amount (USDC)"에 `100`(기본값은 min(500, 잔액 내림)).
3. 비교표(열 "Settlivo" | "Bank wire")를 읽습니다.
4. "Withdraw to KRW" 클릭.
5. 같은 페이지의 "History" 카드를 약 10초 지켜봅니다.
6. 홈(`/worker`)으로 돌아가 잔액을 확인합니다.

### 기대 결과

- [ ] 제목 "Withdraw to KRW", 설명 "Off-ramp through a licensed local partner. Funds usually land in about ten minutes."
- [ ] 폼 아래 "Available: {balance} USDC". 비교표 행: "Fee" "0.5% ({fee} USDC)" vs "$35 + 2.2% spread"; "Rate" "{rate} KRW/USD" vs "bank rate, 2–3% worse"; "Arrives" "~10 minutes" vs "3–5 business days"; "You receive". 하단 "To KB Kookmin ****2841".
- [ ] 제출 직후 History 맨 위에 현지 금액 + 배지 "Processing"(파랑 깜빡임), 부제 "{usdc} USDC · fee {fee} USDC · KB Kookmin ****2841 · {datetime}", "Arriving ~10 minutes".
- [ ] 약 8–11초 뒤 배지 "Completed"; 알림 "Withdrawal completed: ₩…" / "Funds sent to KB Kookmin ****2841.".
- [ ] 홈 잔액이 100 USDC만큼 감소(수수료 0.5 USDC 포함 총액 100이 차감됨, 현지 입금액은 99.5 USDC × 환율).
- [ ] 은행 계좌가 없는 워커(Eun)는 하단 "To — add a bank account in Settings", 버튼 비활성.

### 내부 동작

`createWithdrawal`([src/lib/actions/worker.ts](../src/lib/actions/worker.ts)): 은행 없음 → "Add a bank account in Settings first", 잔액 부족 → "Insufficient balance (x.xx USDC)". 수수료 0.5%(`WITHDRAW_FEE`), `localAmount = fromUsdc(net)`, `eta "~10 minutes"`, `status processing`, 시뮬레이션 모드에서는 즉시 `setBalance(balance − usdc)`. 완료는 `GET /api/tick`([src/app/api/tick/route.ts](../src/app/api/tick/route.ts))이 `createdAt` 기준 8,000 ms 이상 지난 processing 출금을 `completed`로 바꾸고 `withdrawal_completed` 알림을 넣는 방식이라, 3초 폴링 기준 8–11초가 걸립니다. 스펙 [§5.7](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#57-off-ramp-simulation) (스펙의 은행 비교 범위 대신 코드는 $35 + 2.2% 고정값을 씁니다).

### 문제가 있다면

- "Processing"이 11초를 넘겨도 안 바뀌면 탭이 백그라운드라 폴링이 멈춘 것입니다. 탭을 앞으로 가져오세요.
- "That didn't go through" + "Insufficient balance (…)": 잔액보다 큰 금액. 폼의 max도 잔액으로 제한되어 있습니다.
- 버튼이 비활성이면 은행 계좌가 없거나 금액이 0 이하/잔액 초과입니다. 은행은 `/worker/settings` "How you get paid"에서 추가하되 회사 승인이 필요합니다([7](#7-페이아웃-설정-변경과-회사-승인)).

---

## 7. 페이아웃 설정 변경과 회사 승인

### 목적

워커가 수령 지갑·스테이블코인·표시 통화·주기·은행을 바꾸면 즉시 적용되지 않고 회사 승인 대기 상태가 되며, 회사가 diff를 보고 승인/거절하면 반영되는지 확인합니다.

### 사전 조건

리셋 완료(Bob Reyes에게 시드된 대기 변경이 있음: External wallet USDT → Settlivo wallet USDC). 회사 측은 Jordan Lee. 워커 측 새 변경을 내려면 Alice Kim.

### 단계

워커(선택, Alice):

1. `/worker/settings`(네비 "Settings") → "How you get paid" 카드.
2. "Cadence"를 "Bi-weekly"로, "Stablecoin" select를 `USDT`로(도움말 "USDC is the compliance default. USDT is available where local off-ramps prefer it."), "Bank (for withdrawals)" 비우기(비우면 기존 은행 유지) → "Submit for approval".
3. 옆 "Pending change" 카드의 diff를 확인합니다.

회사(Jordan):

4. `/company/approvals`(네비 "Approvals") → "Payout setting changes ({n})".
5. "Bob Reyes" 카드의 PrefsDiff 표를 읽고 "Approve" 클릭. (Alice 카드가 있으면 "Reject" → "Reason" → "Confirm reject"로 거절 경로도 확인.)
6. `/company/workers/wrk_bob` "Payout settings" 카드와 "Wallets" 카드를 확인.

워커(Bob):

7. Bob Reyes로 로그인 → 알림과 `/worker/settings` "Wallets" 카드.

### 기대 결과

- [ ] (Alice) 제출 후 리다이렉트 없이 "Pending change" 카드에 diff(표 행 "Wallet", "Stablecoin", "Display currency", "Cadence", "Bank account"; 바뀐 값은 현재값 취소선 + 제안값 초록; "Stablecoin" USDC → USDT, "Cadence" Monthly → Bi-weekly). Jordan·Mia 양쪽 조직에 알림 "Alice Kim changed payout settings" / "Settlivo wallet · USDT · biweekly. Needs approval.". 활성 설정은 아직 그대로.
- [ ] (Jordan) Bob 카드: 설명 "Submitted {timeAgo}", diff에 "Wallet" "External 0x7c3e5a…" → "Settlivo wallet"(주소는 앞 8자만), "Stablecoin" USDT → USDC. "Approve" → 토스트 "Approved" + "Email sent to the counterparty." → 카운트 "Payout setting changes (0)". 거절 시 토스트 "Rejected".
- [ ] Bob 프로필 "Payout settings": "Wallet"이 플랫폼 지갑 주소, "Stablecoin" USDC; "Wallets" 카드에서 "Settlivo wallet"에 "Payout wallet" 배지. "Pending change awaiting approval." 문구 사라짐.
- [ ] (Bob) 알림 "Acme Remote approved your payout settings" / "Future payouts go to your Settlivo wallet in USDC." (거절이면 "Acme Remote declined your payout settings" / "Reason: …"). 대시보드 "Needs your attention"에서 "Bob Reyes changed payout settings" 행이 사라짐. Bob 홈 "Available balance"가 1,320.50 USDT → 420.00 USDC로 바뀌고 부제가 "PH · paid in USDC · shown in PHP"가 됨(기본 지갑이 Settlivo wallet, 토큰이 USDC로 바뀌어 그 주소·토큰의 시드 잔액을 읽기 때문; 돈이 사라진 것이 아님).
- [ ] (Alice, Jordan이 USDT 변경을 승인했다면) Alice 설정 "Wallets" 행이 "Settlivo-custodied · USDT" / "External · USDT"로 바뀌고 홈 잔액이 USDT 기준 0으로 표시됨(`sim:balance`는 주소+토큰별이라 기존 2,400 USDC는 USDC로 남음); 다음 정산의 `chain.transfer`는 `payoutPrefs.stablecoin` = USDT로 나감. 거절했다면 그대로 USDC.
- [ ] 워커 설정 "Wallets" 카드의 "Use for payouts" 버튼도 같은 승인 흐름을 탑니다: 누르면 그 지갑에 "Approval pending" 배지, 회사 알림 "{Worker} changed payout wallet" / "{label} ({kind}). Needs approval.".

### 내부 동작

`submitPayoutPrefs`([src/lib/actions/worker.ts](../src/lib/actions/worker.ts))는 `pendingPayoutPrefs`만 쓰고(external이면 `0x`+40 hex 검증, 실패 시 "External address must be a 0x… 40-hex address") 모든 소속 조직에 `prefs_submitted` 알림을 보냅니다. `setPayoutWallet`([src/lib/actions/wallets.ts](../src/lib/actions/wallets.ts))도 동일하게 pending만 기록. `approvePayoutPrefs`([src/lib/actions/approvals.ts](../src/lib/actions/approvals.ts)): 승인 시 `payoutPrefs = pending`으로 복사하고 `prefs.walletId` 지갑을 `isDefault`로, 워커의 모든 지갑 `token`을 승인된 stablecoin으로 바꿈(잔액이 주소+토큰별이라 지갑이 코인을 따라감), 거절 시 유지; 둘 다 pending을 지우고 `prefs_approved`/`prefs_rejected` 알림(→ `/worker/settings`). diff 표는 [src/components/approvals/prefs-diff.tsx](../src/components/approvals/prefs-diff.tsx). 스펙 [§5.3](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves), [§5.12](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets). 참고: 스펙은 워커 화면을 "Payout settings"라 부르지만 코드의 제목은 "Settings" / 카드 "How you get paid"입니다.

### 문제가 있다면

- "Payout setting changes (0)"이고 Bob 카드가 없으면 이미 처리된 상태 → 리셋.
- "My own wallet (self-custody)"를 고르고 주소를 비우면 "That didn't go through" + "External address must be a 0x… 40-hex address".
- 승인 후에도 프로필이 안 바뀌면 3초 폴링을 기다리거나 다른 조직으로 로그인한 것인지 확인(Bob은 Acme 소속만).

---

## 8. 워커 결제 요청

### 목적

워커가 먼저 결제를 요청하면 회사의 "Approvals"에 올라오고, "Approve & schedule"로 승인되면 요청한 시각에 정산 예약되는지 확인합니다.

### 사전 조건

리셋 완료(Carlos의 시드 요청 1건 존재). 새 요청을 내려면 Carlos Mendes(또는 아무 활성 워커)로 로그인. 휴대폰 가능.

### 단계

워커(Carlos):

1. `/worker/request`(홈의 "Request payment" 또는 네비).
2. "Company" select: "Acme Remote". "Amount" `500`, "Currency" `BRL`, "Rate" 기본 Spread.
3. "Preferred payout time": 기본 지금 + 2분. "What is it for?": 기본 "Overtime: release weekend" → `Weekend support`로 변경.
4. "Send request".

회사(Jordan):

5. `/company/approvals` → "Payment requests ({n})".
6. 시드 요청 "Carlos Mendes · R$2,400.00"("Overtime: release weekend · wants it {datetime} · requested {timeAgo}") 카드의 "Approve & schedule".
7. 새 요청(R$500) 카드도 "Approve & schedule" (또는 "Reject"로 거절 경로).
8. `/company/invoices?f=open`에서 두 건을 확인하고, 2분짜리 건은 상세에서 정산을 지켜봅니다.

### 기대 결과

- [ ] (Carlos) 제출 후 `/worker/invoices/inv_…`로 리다이렉트, 배지 "Awaiting approval", 승인 버튼 없음(워커 발행 건은 회사가 승인). 홈의 "Upcoming"/"Needs your approval"에는 뜨지 않음.
- [ ] (Jordan) 알림 "Payment request from Carlos Mendes: R$500.00" / "Weekend support · wants it {datetime}"(→ `/company/approvals`). 대시보드 "Needs your attention"에 "Carlos Mendes requested payment" 행(배지 "Awaiting approval").
- [ ] "Approve & schedule" → 토스트 "Approved" + "Email sent to the counterparty." → "Payment requests (0)". `/company/invoices?f=open`에 "Overtime: release weekend" 행 배지 "Scheduled".
- [ ] 시드 요청은 **내일 09:24 UTC(KST 18:24)** 예약이라 즉시 정산되지 않고 Scheduled로 남습니다. 2분 예약으로 낸 새 요청은 [4](#4-워커-승인과-예약-정산)와 같이 Sending → Confirmed.
- [ ] (Carlos) 알림 "Invoice approved: R$500.00" / "Carlos Mendes's invoice is scheduled for {datetime}." 거절이면 "Invoice rejected: …" / "Reason: …".

### 내부 동작

`requestPayment`([src/lib/actions/worker.ts](../src/lib/actions/worker.ts)): 소속 검증("Not a member of that organization"), 금액·통화 검증, `priceAtIssue`, `initiatedBy: "worker"`, `status: pending_approval`, 조직에 `invoice_created` 알림, `scheduleInvoice`(workflow run은 훅 `approve:{id}` 대기). 회사의 `approveWorkerInvoice` → `approveInvoice(id, "org:org_acme", …)`로 `scheduled` 전이 후 run 재개 → `sleep(scheduledAt)` → `settleInvoice`. 회사 인보이스 상세(`/company/invoices/[id]`)에서도 워커 발행 pending 건이면 "Approve" / "Reject"가 보입니다. 스펙 [§5.3](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#53-scenario-3--worker-chooses-payout-conditions-company-approves).

### 문제가 있다면

- "Payment requests (0)"인데 시드 요청이 없으면 이미 승인됨 → `/company/invoices?f=open`에서 "Overtime: release weekend" 확인 또는 리셋.
- 승인 후 내일 예약 건이 안 움직이는 것은 정상입니다(예약 시각까지 대기).
- "That didn't go through" + "Amount must be positive" / "Unsupported currency": 입력값 확인.

---

## 9. 페이롤 런

### 목적

KYC 검증된 워커 전원에게 한 번에 인보이스를 만들어 사전 승인 상태로 즉시 정산하고, 런 페이지에서 건별로 Confirmed되는 과정과 합계를 확인합니다.

### 사전 조건

Jordan Lee로 로그인(Acme Remote). Alice·Bob·Carlos가 verified(시드 기본), Eun은 KYC pending.

### 단계

1. `/company/payroll`(네비 "Payroll" 또는 대시보드 "Run payroll").
2. "New payroll run" 카드: 워커별 행(체크박스 aria-label "Include {name}", 금액 입력 `amount_{id}`, 통화)을 확인합니다. Eun 행은 " · KYC pending", 체크 해제·비활성.
3. "Rate" select 기본 "Spread · market rate at send · 0.5% fee" 유지. 금액은 기본값(마지막 confirmed 인보이스 금액) 유지.
4. "Run payroll now".
5. 런 페이지에서 "Settled" 카드가 "3 / 3"이 될 때까지 지켜봅니다.
6. `/company/payroll`로 돌아가 "Past runs"를 확인합니다.

### 기대 결과

- [ ] 페이지 설명 "Pay everyone at once. Each transfer settles sequentially through the batch settlement contract."; 카드 설명 "Amounts are prefilled from each worker's last confirmed invoice. The rate option applies to every invoice in the run."
- [ ] 제출 → `/company/payroll/run_…`로 리다이렉트. 제목 "Payroll run", 설명 "{datetime} · 3 workers · batch settlement contract", 헤더 배지 "Processing".
- [ ] 카드: "Settled" "0 / 3" 힌트 "settling sequentially…" → 건이 하나씩 "Sending" → "Confirmed"로 바뀌며 "3 / 3" 힌트 "complete"; "Total USDC"(힌트 "locked at send time") 증가; "Saved vs bank wires"(힌트 "{n} business days faster").
- [ ] 타이밍: tick 모드는 폴링당 한 건(약 3초 + 확인 2–5초)씩 순차. workflow 모드는 run이 병렬로 돌아 거의 동시에 Confirmed가 될 수 있습니다.
- [ ] 모두 Confirmed면 헤더 배지 "Completed"(일부 실패면 "Failed"). 행마다 워커 이름 링크, "{amount} → {usdc} USDC", 상태 배지.
- [ ] 각 워커 알림 "Payroll on its way: {amount}" / "Batch settlement started.", 이후 "You received …". 회사 알림 "Settled … to …" 3건.
- [ ] "Past runs": 맨 위에 "{datetime} · 3 workers" + 배지 "Completed"(시드 2건 포함 총 3건). 인보이스 상세 "Details"의 "Payroll run" 링크가 런 페이지로 연결.
- [ ] 워커를 하나도 체크하지 않고 제출 → "That didn't go through" + "Select at least one worker".

### 내부 동작

`createPayrollRun`([src/lib/actions/payroll.ts](../src/lib/actions/payroll.ts))은 선택된 워커마다 `status: scheduled`(승인 단계 없음), `scheduledAt = now`, memo "Payroll run", `payrollRunId`, history note "Payroll run"인 인보이스를 만들고 `PayrollRun {status: running}`을 저장한 뒤 각 건을 `scheduleInvoice`합니다. 런 페이지(`src/app/(company)/company/payroll/[runId]/page.tsx`)는 렌더 시 모든 인보이스가 terminal이면 run status를 `completed` 또는 `partial`로 갱신합니다. 순차 확인의 실체는 `/api/tick`이 한 번에 하나만 정산하는 것(tick 모드)이며, workflow 모드에서는 run별 병렬 정산입니다. 스펙 [§5.5](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#55-payroll-run-batch) (스펙의 "Batch settlement contract call" 문구와 현지통화·수수료 합계는 코드에 없습니다).

### 문제가 있다면

- "Settled"가 "0 / 3"에서 멈춤: workflow 모드 안전망은 45초 후에 작동하므로 탭을 열어 둔 채 최대 1분 기다리세요. 그래도 안 움직이면 `/company/invoices?f=open`에서 건별 상태와 "Error"를 확인.
- Eun이 체크 가능하면 KYC가 이미 verified된 것([10](#10-kyc-차단과-재시도) 수행 후). 이 경우 4 / 4가 됩니다.
- 금액 0 또는 음수 행은 조용히 건너뜁니다(에러 아님).
- 행이 "Blocked · Plan"이고 "Settled" 카드 힌트가 "held by plan limit · see Billing"이면 보내는 조직의 Free 한도(월 3건) 초과입니다 — 스케줄러 문제가 아니라 정상 동작. Nordwind(Free, 3/3 소진)에서 돌렸을 때 그렇습니다. `/company/billing`에서 "Upgrade to Business"를 누르면 보류 건이 자동 재개됩니다([12b](#12b-구독-플랜과-billing)). Acme(Business)는 이 경로를 타지 않으며 "Fee" 행은 0.00 USDC.

---

## 10. KYC 차단과 재시도

### 목적

미검증 워커의 인보이스가 정산 시점에 "Blocked · KYC"로 멈추고, 워커가 3단계 검증을 마치면 회사가 "Retry settlement"로 정산을 재개할 수 있는지 확인합니다.

### 사전 조건

리셋 완료(Eun Nguyen에게 어제 예약된 차단 인보이스 ₫38,000,000 존재, KYC 1/3). 회사 측 Jordan Lee, 워커 측 Eun Nguyen. 워커 단계는 휴대폰 가능.

### 단계

회사(Jordan):

1. `/company/invoices` → "Eun Nguyen" 행의 배지 "Blocked · KYC" → 클릭해 상세.
2. 타임라인과 헤더 배지를 확인합니다. "Retry settlement" 버튼이 **없음**을 확인(워커가 아직 미검증).

워커(Eun):

3. 로그아웃 → "Eun Nguyen"으로 로그인 → `/worker`.
4. 주황 배너 "Finish verification to receive payouts" / "1 of 3 steps complete. Scheduled invoices stay on hold until you're verified." → "Continue" → `/worker/onboarding`.
5. 제목 "Verify your identity". 왼쪽 단계 목록 "Identity document"(완료), "Residential address"(현재), "Tax information".
6. "Residential address" 패널: "Street address" "22 Nguyen Hue, District 1", "City" "Ho Chi Minh City", "Country" 기본값 유지 → "Continue"("Saving…").
7. "Tax information" 패널: "Tax ID" "•••-••-4821", "Tax residency" → "Continue".
8. 스피너 "Reviewing your documents…" / "Automated checks usually finish in a few seconds." 약 3초 → `/worker`로 이동.

회사(Jordan):

9. 다시 Jordan으로 로그인 → Eun 인보이스 상세 → "Retry settlement".

### 기대 결과

- [ ] (회사, 차단 상태) 헤더 배지 "Blocked · KYC"(주황); 타임라인 "Approved & scheduled" 아래 주황 "Blocked until worker completes KYC"; "Details"의 "Worker" 행에 "· VN · KYC pending". 대시보드 "Needs your attention"에 "Eun Nguyen · KYC pending". 회사 알림 "Payout blocked: verification pending".
- [ ] (워커, 검증 전) 헤더 부제 "VN · VND · KYC pending"; "Upcoming"에 "Acme Remote ₫38,000,000" + "On hold until verified"; 인보이스 상세 주황 배너 "Payout blocked until verification is complete."; 알림 "Complete verification to receive ₫38,000,000".
- [ ] (워커, 검증 후) 배너 사라짐, 부제 "VN · VND · Verified"; `/worker/onboarding`은 "You're verified." / "Verified on {date}."; "Upcoming" 부제 "Verified, waiting for your company to retry"; 인보이스 배너 "You are verified. Your company can retry this payout now."; 알림 "You're verified" / "Payouts are unlocked. Scheduled invoices can now settle.".
- [ ] (회사) 알림 "Eun Nguyen completed verification" / "Blocked payouts can be retried now."; 대시보드 행이 "Eun Nguyen · verified, retry to settle"로 바뀜; 인보이스 상세에 "Retry settlement" 버튼 등장.
- [ ] "Retry settlement" → 토스트 "Settlement restarted" → 수 초 내 "Sending" → "Confirmed"(예약 시각이 이미 지났으므로 즉시 due), On-chain record "Verified". Eun 알림 "You received {usdc} USDC". Eun 홈 잔액 0 → 정산액.

### 내부 동작

`settleInvoice`는 `worker.kyc.status !== "verified"`이면 전송 없이 `blockedReason: "kyc"`만 기록하고(status는 `scheduled` 유지) 조직에 `invoice_blocked` 알림을 보냅니다. `/api/tick`은 `blockedReason`이 있는 건을 건너뜁니다. 온보딩은 `completeKycStep(step)` → `finishKyc`([src/lib/actions/worker.ts](../src/lib/actions/worker.ts))가 `kyc.status = verified`, 워커·모든 조직에 `kyc_verified` 알림을 넣고 `/worker`로 리다이렉트(위저드 [src/components/worker/kyc-wizard.tsx](../src/components/worker/kyc-wizard.tsx)는 파일을 실제로 업로드하지 않으며, 3단계 완료 후 3,000 ms 뒤 자동으로 `onFinish`). 검증 완료가 차단 건을 자동 재시도하지는 않습니다. 회사의 `retryInvoiceAction` → `retryInvoice`([src/lib/scheduler/index.ts](../src/lib/scheduler/index.ts)): `scheduled + blockedReason`이면 플래그만 지우고(`failed`면 `scheduled`로 전이) `scheduleInvoice`; `scheduledAt`은 해시의 일부라 바꾸지 않습니다. Retry 버튼은 `failed`, `scheduled + blockedReason "kyc" + 워커 verified`, 또는 `scheduled + blockedReason "plan" + 플랜에 전송 여유(`canSend`, 업그레이드/월 갱신 후)`일 때 렌더링됩니다. 플랜 보류 건은 상단에 주황 배너(`data-testid="plan-notice"`: "Held by your plan: Free allows 3 sends a month and all are used. Upgrade to send now, or wait until {datetime}." / 여유가 생기면 "Your plan has sends available again ({n} left this month). Retry to send this payout now.")와 타임라인 "Held by the sender's plan limit"가 보입니다([12b](#12b-구독-플랜과-billing)). 스펙 [§5.8](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#58-kyc-simulation), [§8](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#8-error-handling-and-fallbacks) (스펙의 `blocked_kyc`/`blocked_plan` 플래그는 코드에서 `blockedReason: "kyc" | "plan"`).

### 문제가 있다면

- "Retry settlement"이 안 보이면 (a) 워커가 아직 verified가 아니거나 (b) 이미 재시도되어 "Sending"/"Confirmed"입니다.
- 온보딩이 "Reviewing your documents…"에서 멈추면 3초 뒤 서버 액션이 실패한 것입니다. 페이지를 새로 열어 "You're verified."인지 확인.
- Retry 후에도 안 움직이면 [4](#4-워커-승인과-예약-정산)의 안전망 안내(workflow 모드 45초).
- 워커 화면에는 Retry 버튼이 없습니다. 회사가 눌러야 합니다.

---

## 11. 알림

### 목적

헤더 종 아이콘(최근 8건 + 미읽음 배지)과 `/notifications` 전체 목록(일자별 그룹, 열면 모두 읽음 처리)이 동작하는지 확인합니다.

### 사전 조건

리셋 직후 Jordan Lee(알림 12건, 미읽음 7)로 가장 잘 보입니다. 어느 페르소나든 가능.

### 단계

1. 헤더의 종 아이콘(aria-label "Notifications")을 클릭합니다.
2. 드롭다운 항목 하나를 클릭해 링크 대상으로 이동합니다.
3. 드롭다운의 "View all" → `/notifications`.
4. 목록을 훑은 뒤 다른 페이지로 갔다가 종 아이콘을 다시 확인합니다.

### 기대 결과

- [ ] 종 아이콘에 초록 미읽음 수 배지(Jordan: 7). 드롭다운 헤더 "Notifications", 최근 8건(제목, 본문 1줄, "{n}m ago"), 미읽음은 초록 점. 비어 있으면 "You're all caught up."
- [ ] `/notifications`: 제목 "Notifications", 설명 "12 total"(Jordan). 일자 헤딩 "Friday, October 24" 형식, 각 항목 제목·본문·"Oct 24, 10:02 AM". 비어 있으면 "Nothing yet."
- [ ] `/notifications`를 한 번 연 뒤에는 미읽음 배지가 사라지고 드롭다운의 초록 점도 없어짐.
- [ ] Jordan의 시드 알림 예: "Payment request from Carlos Mendes", "Bob Reyes changed payout settings", "Payout blocked: verification pending", "Settled 3,042.57 USDC to Alice Kim". Alice 예: "You received 3,042.57 USDC", "Withdrawal completed: ₩2,067,411". Eun: "Complete verification to receive ₫38,000,000". 플랜 관련([12b](#12b-구독-플랜과-billing) 수행 후, Nordwind): "Monthly send limit reached (3 on Free)" / "{amount} for {worker} is on hold. Upgrade to keep sending this month."와 "Nordwind Labs is on Business" / "Unlimited sends. 2 held payouts resumed."(둘 다 → `/company/billing`).
- [ ] 항목 클릭 시 `href`로 이동(인보이스 상세, `/company/approvals`, `/worker/settings`, `/worker/withdraw` 등).

### 내부 동작

모든 알림은 `notify()`([src/lib/settlement/notify.ts](../src/lib/settlement/notify.ts)) 한 곳에서 생성되어 `notification:{id}` + 리스트 `{org|worker}:{id}:notifications`(LPUSH, 최신 우선)에 저장됩니다([src/lib/db/repo.ts](../src/lib/db/repo.ts)). `NotificationBell`([src/components/shell/notification-bell.tsx](../src/components/shell/notification-bell.tsx))은 서버 컴포넌트로 최근 8건을 읽고, `/notifications`([src/app/notifications/page.tsx](../src/app/notifications/page.tsx))는 최대 200건을 읽은 뒤 즉시 `markNotificationsRead`합니다. 21가지 kind(invoice_created/approved/rejected/scheduled/settled/failed/blocked/rate_lock_expired/blocked_plan, plan_upgraded, prefs_submitted/approved/rejected, withdrawal_completed, kyc_verified, worker_invited/offboarded, wallet_added, link_requested/accepted/declined)가 있으며 "Email sent" 토스트는 실제 이메일이 아니라 알림 생성의 시각적 신호입니다. 스펙 [§5.9](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#59-notifications) (스펙 §7의 "페르소나당 ~15건"은 코드에서 총 27건: Acme 12, Alice 5, Bob 4, Carlos 3, Nordwind 1, Dana 1, Eun 1).

### 문제가 있다면

- Mia Schulz로 로그인하면 알림이 1건(읽음)뿐이고 배지가 없습니다. 정상입니다.
- 새 알림이 드롭다운에 안 보이면 3초 폴링을 기다리거나 드롭다운을 다시 여세요(서버 컴포넌트라 리프레시 시 갱신).
- 알림 링크가 404면 리셋 이전의 ID를 가리키는 옛 알림입니다.

---

## 12. 조직 전환

### 목적

여러 조직을 관리하는 관리자가 헤더 `<select>`로 활성 조직을 바꾸면 대시보드·워커·지갑이 그 조직 기준으로 바뀌는지, 단일 조직 관리자에게는 선택기가 없는지 확인합니다.

### 사전 조건

Jordan Lee(Acme + Nordwind)로 로그인. 비교용으로 Mia Schulz(Nordwind만).

### 단계

1. `/company` 헤더 로고 옆 조직 `<select>`(aria-label "Organization")를 "Nordwind Labs"로 바꿉니다.
2. 대시보드, `/company/workers`, `/company/invoices`, `/company/wallets`를 차례로 봅니다.
3. 다시 "Acme Remote"로 돌아갑니다.
4. 로그아웃 → "Mia Schulz"로 로그인 → 헤더를 확인합니다.

### 기대 결과

- [ ] 선택 즉시 `/company`로 이동, 제목 "Nordwind Labs", 설명 "DE · KYB verified · treasury 0x9a1f3c2e…", 헤더 부제 "Finance Lead · Nordwind Labs", "Treasury balance" 26,100.00 USDC(21,900 + 4,200), "Workers" 2.
- [ ] `/company/workers`: 테이블 컬럼 "Name | Country | Payout | KYC | Since | Settlements"(+ 행 끝 "Pay" 버튼 → 그 워커가 미리 선택된 `/company/invoices/new?worker={id}`); 행은 "Alice Kim"(KR · KRW)과 "Dana Kowalski"(PL · PLN); "Former workers (1)"에 "Finn Larsen" + 배지 "Former". Alice의 "Settlements"는 Nordwind 건수(3)만.
- [ ] `/company/invoices`: Nordwind 건 총 9건 — Alice의 Nordwind 급여 ₩1,900,000 ×3(Memo 옆 "Fixed" 배지), Dana zł12,500 ×3 + "Design retainer" zł3,064(spread), Finn €4,100 ×2. Acme 건은 없음.
- [ ] "Needs your attention"은 "Nothing pending."
- [ ] 네비 "Billing"(`/company/billing`): "Current plan" "Free", "Sends this month: 3 of 3", 주황 "Limit reached. New payouts wait until you upgrade or the month renews." Nordwind는 Free 플랜으로 이달 3/3건을 소진한 상태라 여기서 페이롤을 돌리면 행마다 "Blocked · Plan"이 됩니다 → [12b. 구독 플랜과 Billing](#12b-구독-플랜과-billing).
- [ ] `/company/wallets`는 두 조직 카드를 모두 보여주지만 "Add a wallet" 폼은 활성 조직 카드에만 있고 다른 카드는 "Switch to {org} in the header to add wallets or change its default."
- [ ] Mia: 헤더에 `<select>` 대신 "Nordwind Labs" 텍스트만. 부제 "People Ops · Nordwind Labs".

### 내부 동작

`OrgSwitcherClient`([src/components/shell/org-switcher-client.tsx](../src/components/shell/org-switcher-client.tsx))는 `session.orgIds`가 2개 이상일 때만 native `<select>`를 렌더링하고 `onChange`로 `switchOrg(orgId)`([src/lib/actions/session.ts](../src/lib/actions/session.ts))를 호출합니다. `switchOrg`는 세션의 `orgIds`에 포함된 조직만 허용하며 쿠키의 `orgId`를 바꾸고 `/company`로 리다이렉트합니다. 모든 회사 페이지는 `companyContext(session.orgId)`로 데이터를 읽으므로 자동으로 조직이 바뀝니다. 스펙 [§5.10](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#510-multi-org), [§4.1](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#41-ontology) (스펙의 "header menu"는 코드에서 native select).

### 문제가 있다면

- `<select>`가 안 보이면 Mia처럼 조직이 하나뿐인 세션입니다. Jordan으로 로그인하세요.
- 전환 후 Acme 데이터가 남아 보이면 3초 폴링 전 화면입니다. 잠시 기다리세요.

---

## 12b. 구독 플랜과 Billing

### 목적

보내는 조직의 구독 플랜(Free 월 3건 / Pro / Business 무제한)이 정산을 막는지, Free 한도를 넘긴 정산이 "Blocked · Plan"으로 보류되고 `/company/billing`에서 업그레이드(결제 시뮬레이션)하면 보류 건이 자동으로 재개되는지 확인합니다. 받는 쪽(워커)은 항상 무료입니다. 데모 대본 18단계와 같습니다.

### 사전 조건

리셋 완료. Jordan Lee로 로그인한 뒤 헤더 조직 `<select>`를 "Nordwind Labs"로 전환([12](#12-조직-전환)). 시드 플랜: Acme = Business(무제한, 이달 6건 전송, 11/12 갱신), Nordwind = Free(월 3건 중 3건 소진, 11/1 갱신). Alice·Dana가 verified(시드 기본).

### 단계

회사(Jordan, Nordwind):

1. `/company/billing`(네비 "Billing")을 열어 "Current plan" 카드를 읽습니다.
2. `/company/payroll` → "New payroll run"에 Alice·Dana 두 행 → "Run payroll now".
3. 런 페이지의 행 배지와 "Settled" 카드 힌트를 확인합니다. 한 행을 클릭해 인보이스 상세의 배너·타임라인을 확인합니다.
4. `/company`(대시보드) "Needs your attention"을 확인합니다.
5. (선택) Alice Kim으로 로그인해 `/worker` "Upcoming"과 인보이스 상세를 본 뒤 다시 Jordan(Nordwind)으로 돌아옵니다.
6. `/company/billing` → "Plans" 카드의 "Business" 칸에서 "Upgrade to Business"(카드 입력란은 비활성 샘플값).
7. 런 페이지로 돌아가 헤더 배지가 "Completed"가 될 때까지 지켜봅니다.

### 기대 결과

- [ ] (전) Billing: 제목 "Billing", 설명 "The sending account pays a flat monthly fee. Receiving is always free."; "Current plan" 카드(부제 "Nordwind Labs") "Free", "$0 per month", "Renews {datetime}", "Sends this month: 3 of 3" + 주황 진행 막대(aria-label "Sends used this month"), 주황 안내 "Limit reached. New payouts wait until you upgrade or the month renews.", "Held payouts: 0". 오른쪽 "What per-transfer billing would have cost" 카드("{n} confirmed settlements this month", "Per-transfer fees" / "Your plan", 각주 "Fixed-rate premium (0.6%) and off-ramp fees stay outside the plan."). "Plans" 카드: "Free"("$0 per month", "Individuals and companies", "3 sends / month", "Included", 배지 "Current"), "Pro"("$9", "Individuals", "Unlimited sends", 버튼 "Upgrade to Pro"), "Business"("$99", "Companies", "Unlimited sends", 비활성 입력 "Card number" 4242 4242 4242 4242 / "Expiry" 12/28 / "CVC" 123, 버튼 "Upgrade to Business"); 각주 "Simulated checkout — no card is charged."
- [ ] 페이롤 제출 → `/company/payroll/run_…`, 설명 "{datetime} · 2 workers · batch settlement contract", 배지 "Processing". 수 초 내 두 행 모두 배지 "Blocked · Plan"(주황), "Settled" "0 / 2" 힌트 "held by plan limit · see Billing"(링크).
- [ ] 회사 인보이스 상세: 헤더 배지 "Blocked · Plan", 상단 주황 배너 "Held by your plan: Free allows 3 sends a month and all are used. Upgrade to send now, or wait until {datetime}."("Upgrade" 링크 → `/company/billing`), 타임라인 "Approved & scheduled" 아래 "Held by the sender's plan limit". "Retry settlement" 버튼 없음(플랜에 여유가 없으므로).
- [ ] 회사 알림 "Monthly send limit reached (3 on Free)" / "{amount} for {worker} is on hold. Upgrade to keep sending this month."(→ `/company/billing`), 2건. 대시보드 "Needs your attention"에 "Alice Kim · held by plan limit", "Dana Kowalski · held by plan limit"(배지 "Blocked · Plan", → `/company/billing`); "In flight" 2.
- [ ] Billing "Current plan" 카드에 "Held payouts: 2" + 보류 건 목록("{worker} · Payroll run" + 금액, → 인보이스 상세).
- [ ] (Alice) `/worker` "Upcoming"에 "Nordwind Labs ₩1,900,000" + 부제 "On hold: company plan limit"; 인보이스 상세 주황 배너 "Your company's plan limit is holding this payout. It resumes as soon as they upgrade or the month renews."
- [ ] "Upgrade to Business" → `/company/billing`으로 리다이렉트, "Current plan" "Business", "$99 per month", "Renews {오늘 + 30일}", "Sends this month: 3"(한도 없음, 진행 막대 없음), "Held payouts: 0"; "Business" 칸 버튼 "Current plan"(비활성) + 배지 "Current". 회사 알림 "Nordwind Labs is on Business" / "Unlimited sends. 2 held payouts resumed."(보류 건이 없었다면 "Unlimited sends from now on.").
- [ ] 런 페이지: 행이 "Sending" → "Confirmed", "Settled" "2 / 2" 힌트 "complete", 배지 "Completed". 각 인보이스 "FX & settlement amount"의 "Fee" "0.00 USDC"(Business + spread), "Pricing"은 여전히 "Spread · 0.5% fee". 워커 알림 "You received …". 업그레이드 후 "Sends this month"는 5.
- [ ] Free 조직이 마지막 한도 건을 쓰면 회사 알림 "Last free send of the month used" / "The next payout will wait until you upgrade or the month renews."(시드 Nordwind는 이미 3/3이라 리셋 직후에는 볼 수 없음).

### 내부 동작

플랜은 `org.plan = { tier, renewsAt, sendsThisMonth }`([src/lib/domain/plan.ts](../src/lib/domain/plan.ts): `PLANS` Free $0 · 3 sends/월, Pro $9 · 무제한, Business $99 · 무제한; `currentPlan`은 `renewsAt`이 지나면 카운터 0으로 갱신, 플랜이 없는 조직은 Free). `settleInvoice`는 KYC 확인 뒤 `canSend(plan)`이 false면 `blockedReason: "plan"`만 기록하고(status `scheduled` 유지) `invoice_blocked_plan` 알림을 보냅니다; confirmed 후 `recordSend`로 `sendsThisMonth += 1`, 남은 건수가 0이 되면 "Last free send of the month used" 알림. 수수료는 `planFeeUsdc(tier, mode, usdc)`: Free는 0.5% / 1.1% 전액, 유료는 spread 0 / fixed 0.6%(프리미엄만). `badgeStatus`([src/lib/domain/invoice-status.ts](../src/lib/domain/invoice-status.ts))가 `blockedReason === "plan"`이면 `blocked_plan` → 라벨 "Blocked · Plan". `/api/tick`은 `blockedReason`이 있는 건을 건너뜁니다. `upgradePlan`([src/lib/actions/billing.ts](../src/lib/actions/billing.ts)): `tier`가 `pro`/`business`가 아니면 "Choose a paid plan" 예외; `upgrade()`로 tier 변경 + `renewsAt = now + 30일`, 그 조직의 `scheduled + blockedReason "plan"` 인보이스 전부의 플래그를 지우고 `scheduleInvoice`(자동 재개), `plan_upgraded` 알림, `/company/billing`으로 리다이렉트. 회사 인보이스 상세의 "Retry settlement"는 플랜에 여유가 생긴 뒤(월 갱신 등)에도 보류 건을 수동 재개할 수 있습니다([10](#10-kyc-차단과-재시도)). Billing 페이지는 [src/app/(company)/company/billing/page.tsx](../src/app/(company)/company/billing/page.tsx). 스펙 [§5.2](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#52-scenario-2--currency-based-amount-fx-pricing-spread-or-fixed) "Plans", [§5.4](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#54-settlement-step-shared-by-both-scheduler-engines), [§6](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#6-screens) `/company/billing`.

### 문제가 있다면

- 페이롤 행이 "Blocked · Plan"이 아니라 바로 "Confirmed"면 이미 업그레이드된 상태(Business는 리셋 전까지 유지) → 리셋 후 다시.
- "Upgrade to Business"를 눌렀는데 보류 건이 안 움직이면 workflow 모드 안전망(45초)을 기다리거나 인보이스 상세의 "Retry settlement"를 누르세요.
- Acme에서는 이 경로를 볼 수 없습니다(Business, 무제한). Nordwind로 전환했는지 헤더 부제 "Finance Lead · Nordwind Labs"로 확인.
- "That didn't go through" + "Choose a paid plan"은 `tier` 값이 유료가 아닐 때(폼을 조작한 경우)만 납니다.

---

## 13. 워커 등록·제거·오프보딩

### 목적

회사가 워커를 등록하면 플랫폼 지갑과 초대 알림이 만들어지고, 오프보딩은 최종 정산 인보이스가 confirmed될 때 멤버십이 종료되며, 미결 인보이스가 있는 워커는 제거가 거부되는지 확인합니다.

### 사전 조건

Jordan Lee(Acme Remote). 오프보딩 대상 Bob Reyes가 활성이고 미결 인보이스가 없어야 함(리셋 기본). 제거 거부를 보려면 Carlos(시드 요청이 pending).

### 단계

등록:

1. `/company/workers`(네비 "Workers") → "Add worker" 카드: "Name" `Mateo Ruiz`, "Email" `mateo@settlivo.demo`, "Country" `ES`, "Local currency" `EUR`, "Stablecoin" `USDC` → "Add worker".
2. 프로필(`/company/workers/wrk_…`)의 카드들을 확인합니다. "New invoice" 버튼으로 `/company/invoices/new?worker=…`가 미리 선택되는지도 확인.

제거 거부:

3. `/company/workers/wrk_carlos` → "Offboarding" 카드 하단 "Remove from team" 버튼 상태를 확인.

오프보딩:

4. `/company/workers/wrk_bob` → "Offboarding" 카드: "Final payment (PHP)"에 `10000` → "Offboard".
5. 프로필 헤더 배지를 지켜봅니다(Offboarding → Former).
6. `/company/workers`의 "Former workers ({n})" 섹션과 Bob 프로필의 "History"를 확인.
7. (선택) Bob Reyes로 로그인해 홈 상단 공지를 확인.

### 기대 결과

- [ ] 등록: 리다이렉트(토스트 없음) → 제목 "Mateo Ruiz", 설명 "mateo@settlivo.demo · ES · EUR", 헤더 배지 "Active"; "Payout settings" "KYC" 배지 "Pending", "Cadence" Monthly; "Wallets"에 "Settlivo wallet" + "Payout wallet" 배지, 잔액 0.00 USDC; "History" "No invoices yet."; "Link requests" "No requests yet.". 워커 테이블(컬럼 "Name | Country | Payout | KYC | Since | Settlements", 행 끝 "Pay" 버튼 → 그 워커가 미리 선택된 `/company/invoices/new?worker={id}`)에 "Mateo Ruiz" 행(설명 "5 people across 5 countries"). Mateo 앞으로 알림 "Acme Remote invited you to Settlivo" / "Finish verification to receive payouts."
- [ ] 같은 이메일로 다시 등록 → 변경 없이 기존 프로필로 리다이렉트.
- [ ] 제거 거부(Carlos): "Remove without a final payment." 아래 "Settle or reject 1 open invoice first." 문구, "Remove from team" 비활성. (서버까지 도달하면 "That didn't go through" + 같은 메시지.)
- [ ] 오프보딩(Bob): 리다이렉트 → 헤더 배지 "Offboarding"(깜빡임), "Offboarding" 카드 "Final settlement in progress · view the final invoice"(링크 → 최종 인보이스, memo "Final settlement", 배지 Scheduled/Sending). "New invoice" 버튼 사라짐.
- [ ] 최종 인보이스 Confirmed(수 초; workflow 모드면 즉시 due) → 배지 "Former", 카드 "Left on {datetime}". `/company/workers` 테이블에서 사라지고 "Former workers (1)"에 "Bob Reyes · PH · PHP · Left {datetime}" + 배지 "Former". 설명이 "4 people across 4 countries"(Mateo 포함).
- [ ] 회사 알림 "Bob Reyes offboarded" / "Final settlement confirmed on-chain."; Bob 알림 "Acme Remote is offboarding you" / "Final settlement of ₱10,000.00 is on its way." 그리고 "Final payment settled" / "Your membership has ended; your history and wallet stay available.".
- [ ] (Bob 홈) 공지 "Offboarded from Acme Remote on {date}. Your history and wallets stay available."; 로그인 목록에는 계속 보임(다른 조직이 없으면 홈에 조직 데이터만 없음). "Recent payouts"에 과거 기록 유지.
- [ ] 최종 금액 0으로 "Offboard" → 즉시 "Former"(인보이스 없음), Bob 알림 본문 "No final payment. Your history and wallets stay available.".

### 내부 동작

`registerWorker`([src/lib/actions/workers.ts](../src/lib/actions/workers.ts)): 이메일 중복이면 활성 멤버 → 리다이렉트, 아니면 `joinOrg` + "…added you to their team" 알림; 신규면 `wrk_*` ID, 플랫폼 지갑 "Settlivo wallet"(isDefault), kyc pending(모든 step false), membership active, payoutPrefs {platform, stablecoin, displayCurrency=localCurrency, cadence monthly}, `worker_invited` 알림. `removeWorker`: pending_approval/scheduled/sending 인보이스가 있으면 "Settle or reject {n} open invoice(s) first" 예외, 아니면 `leaveOrg`(offboarded + leftAt) + 알림. `offboardWorker`: 금액 > 0이면 `status: scheduled`, memo "Final settlement", history note "Offboarding"인 인보이스를 만들고 membership을 `offboarding` + `finalInvoiceId`로, `scheduleInvoice`; `settleInvoice`가 그 건을 confirmed로 만들 때 `completeOffboarding`을 호출해 `offboarded`로 바꾸고 양쪽에 `worker_offboarded` 알림. 멤버십 상태 머신은 [src/lib/domain/membership.ts](../src/lib/domain/membership.ts). 스펙 [§5.11](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#511-worker-lifecycle) (스펙의 "Email sent" 토스트는 Add worker에 없음; 최종 정산 인보이스는 rateMode 없이 생성되어 spread로 처리됨).

### 문제가 있다면

- "That didn't go through" + "Name is required" / "Unsupported currency": 폼 확인.
- "Offboarding"에서 "Former"로 안 넘어가면 최종 인보이스가 정산되지 않은 것 → 링크로 인보이스를 열어 상태/Error 확인, workflow 모드면 45초 안전망 대기.
- Bob이 KYC 미검증이면 최종 인보이스가 "Blocked · KYC"로 멈춥니다(시드 Bob은 verified).
- 오프보딩 중(offboarding)에는 "Offboard" 폼이 숨겨져 두 번 제출할 수 없습니다.

---

## 14. 조직 지갑

### 목적

관리자가 관리하는 모든 조직의 지갑(라벨·주소·종류·잔액·이달 지급)이 보이고, 활성 조직에 지갑을 추가하거나 기본 지갑을 바꿀 수 있는지 확인합니다.

### 사전 조건

Jordan Lee로 로그인(활성 조직 Acme Remote).

### 단계

1. `/company/wallets`(네비 "Wallets").
2. 두 조직 카드의 표를 읽습니다.
3. Acme 카드의 "Add a wallet" 폼: "Label" `Bonus pool`, "Address (optional)" 비움 → "Add wallet".
4. 새 행의 "Make default"를 눌렀다가 "Treasury"의 "Make default"로 되돌립니다.
5. "Address (optional)"에 `0xabc`처럼 잘못된 값을 넣고 "Add wallet"을 눌러 에러를 확인.
6. 대시보드 "Treasury balance" 힌트의 지갑 수를 확인.

### 기대 결과

- [ ] 제목 "Wallets", 설명 "Every company account you administer and the wallets behind it."
- [ ] Acme 카드: 설명 "US · 2 wallets · 60,750.00 USDC"; 행 "Treasury"(Kind "Settlivo-custodied", Balance 48,250.00 USDC, 배지 "Default"), "Operations"(Kind "External", 12,500.00 USDC, 버튼 "Make default"). 컬럼 "Label | Address | Kind | Balance | Paid this month"; "Paid this month"는 기본 지갑에만 집계.
- [ ] Nordwind 카드: "DE · 2 wallets · 26,100.00 USDC"; "Treasury"(Default), "EUR operations"(External). 폼 대신 "Switch to Nordwind Labs in the header to add wallets or change its default." "Make default" 버튼 없음.
- [ ] "Bonus pool" 추가 → 리다이렉트 없이 Acme 표에 새 행(Kind "Settlivo-custodied", 0.00 USDC), 설명 "3 wallets". 폼 도움말 "Leave blank to create a Settlivo-custodied wallet".
- [ ] "Make default" → 그 행에 "Default" 배지, 대시보드 설명의 "treasury 0x…" 주소가 바뀜. 되돌리면 원복.
- [ ] 잘못된 주소 → "That didn't go through" + "Address must be a 0x… 40-hex address"(브라우저 pattern 검증에 먼저 걸릴 수 있음).
- [ ] 대시보드 "Treasury balance" 힌트 "3 wallets · Base".

### 내부 동작

페이지(`src/app/(company)/company/wallets/page.tsx`)는 `session.orgIds`의 모든 조직을 순회해 `listWalletsByOwner`와 `chain.getBalance`로 카드를 만듭니다. `addOrgWallet`([src/lib/actions/wallets.ts](../src/lib/actions/wallets.ts)): 라벨 기본 "Wallet", 주소 비우면 `kind: platform`(sha256 기반 결정적 주소), 있으면 소문자화 후 `/^0x[0-9a-f]{40}$/` 검증 → `kind: external`; 새 지갑은 기본이 아님. `setOrgDefaultWallet`: 활성 조직의 활성 지갑만, `isDefault`를 옮기고 `org.defaultWalletId`·`org.walletAddress`를 갱신. 시드 지갑은 [src/lib/seed/personas.ts](../src/lib/seed/personas.ts). 스펙 [§5.12](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets), [§4.1](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#41-ontology).

### 문제가 있다면

- Nordwind에 지갑을 추가하려면 먼저 헤더에서 조직을 전환하세요([12](#12-조직-전환)).
- 새 지갑 잔액은 항상 0이며 시뮬레이션 송금의 `from`은 플랫폼 주소(0x5e77a1b2…)로 고정이라 기본 지갑을 바꿔도 송금 출처 표시는 바뀌지 않습니다.
- "Make default"가 없는 행은 다른 조직(비활성) 또는 이미 기본인 지갑입니다.

---

## 15. 워커 지갑과 링크 요청

### 목적

워커가 자신의 지갑을 추가·관리하고, 회사가 보낸 지갑/은행 링크 요청을 설정 화면에서 수락·거절할 수 있는지 확인합니다.

### 사전 조건

리셋 완료(Bob에게 Acme의 지갑 링크 요청 1건 pending). 워커 측 Alice Kim(지갑 2개) 및 Bob Reyes; 회사 측 Jordan Lee. 워커 단계는 휴대폰 가능.

### 단계

워커 지갑(Alice):

1. `/worker/settings` → "Wallets" 카드를 읽습니다.
2. 폼 "Label" `Rabby`, "Address (optional)" 비움 → "Add wallet".
3. (선택) "Ledger (cold)" 행의 "Use for payouts" → 배지 변화 확인([7](#7-페이아웃-설정-변경과-회사-승인)의 승인 흐름).

회사가 링크 요청 보내기(Jordan):

4. `/company/workers/wrk_alice` → "Link requests" 카드: "Request" select "A bank account", "Message" 비움 → "Send request".

링크 요청 응답(Bob):

5. Bob Reyes로 로그인 → `/worker/settings` → "Requests from your companies" 카드의 Acme 요청("Please link a USDC wallet for the Q4 bonus run.").
6. 폼 "Label" `Rabby`, 주소 비움 → "Add wallet and accept". (대안: "Decline".)

확인(Jordan):

7. `/company/workers/wrk_bob` "Link requests"와 "Wallets" 카드, 알림.

### 기대 결과

- [ ] (Alice) 카드 설명 "Payouts go to the wallet marked Payout wallet. Changing it needs your company's approval."; 행 "Settlivo wallet"("Settlivo-custodied · USDC", 배지 "Payout wallet"), "Ledger (cold)"("External · USDC", 버튼 "Use for payouts"). 하단 "How you get paid" 카드 설명 "Your Settlivo wallet: 0xa11ce0000000000000000000000000000000a11c"(전체 주소, 축약 안 됨).
- [ ] "Rabby" 추가 → 목록에 "Rabby" "Settlivo-custodied · USDC" 행, 토스트 없음. Jordan·Mia 알림 "Alice Kim added a wallet" / "Rabby (platform)"(→ `/company/workers/wrk_alice`). 회사 프로필 "Wallets" 카드에도 "Rabby".
- [ ] "Use for payouts" → 그 행에 "Approval pending" 배지, 회사 알림 "Alice Kim changed payout wallet" / "Ledger (cold) (external). Needs approval.", `/company/approvals`에 Alice 카드.
- [ ] (Jordan → Alice 요청) "Link requests" 목록에 "Bank account" + 배지 "Pending", 기본 메시지 "Please add a bank account for local payouts.", "Sent {datetime}". Alice 알림 "Acme Remote asked you to link a bank account"(→ `/worker/settings`). Alice 설정에서 이 요청은 "Accept"(은행이 이미 있으므로 활성) / "Decline"; 은행이 없는 워커는 "Accept" 비활성 + "Add your bank account below first".
- [ ] (Bob) 요청 카드 "Acme Remote" "asks for a wallet · {timeAgo}" + 배지 "Pending" + 메시지. "Add wallet and accept" → 배지 "Accepted", "Wallets"에 "Rabby" 추가. Jordan 알림 "Bob Reyes linked a wallet" / "Ready for payouts from Acme Remote.". 거절 시 배지 "Declined", 알림 "Bob Reyes declined your wallet request" / 원문 메시지.
- [ ] (Jordan) Bob 프로필 "Link requests": "Wallet" + 배지 "Accepted", "Sent {datetime} · answered {datetime}".
- [ ] 잘못된 주소(`0x123`) → "That didn't go through" + "Address must be a 0x… 40-hex address".

### 내부 동작

`addWorkerWallet`([src/lib/actions/wallets.ts](../src/lib/actions/wallets.ts)): 조직 지갑과 같은 라벨/주소 규칙, token = `payoutPrefs.stablecoin`; 모든 소속 조직에 `wallet_added` 알림; hidden `linkRequestId`가 있으면 `respondLinkRequest(id, true, wallet.id)`까지 수행. `requestLink`([src/lib/actions/workers.ts](../src/lib/actions/workers.ts)): 활성 멤버에게만, `LinkRequest {status: pending}` 저장 + `link_requested` 알림. `respondLinkRequest`: 본인의 pending 요청만 accepted/declined + `resolvedAt` + `link_accepted`/`link_declined` 알림. 정산은 워커의 기본 활성 지갑(`isDefault`)으로 보내므로 지갑 추가만으로는 수령처가 바뀌지 않고 [7](#7-페이아웃-설정-변경과-회사-승인)의 승인이 필요합니다. 스펙 [§5.12](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#512-wallets), [§4.1](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#41-ontology).

### 문제가 있다면

- "Requests from your companies" 카드 자체가 없으면 그 워커에게 링크 요청이 하나도 없는 것입니다(Alice는 Jordan이 보내기 전까지 없음).
- Bob의 요청이 "Accepted"/"Declined"로 이미 끝나 있으면 리셋.
- 은행 요청의 "Accept"가 비활성이면 "How you get paid"에서 "Bank (for withdrawals)" + "Account last 4"를 제출하고 회사 승인을 받은 뒤 다시 시도.

---

## 16. 실패 처리와 안전장치

### 목적

정산 실패·차단·검증 오류·환율 fallback 같은 예외 경로가 화면에 어떻게 드러나고 어떻게 복구되는지 확인합니다.

### 사전 조건

위 섹션들을 한 번 이상 수행한 상태. 일부 항목(정산 실패)은 시뮬레이션 모드에서 의도적으로 만들 수 없으므로 "보이는 형태"만 확인합니다.

### 단계

1. 서버 검증 오류: `/company/payroll`에서 워커를 모두 체크 해제하고 "Run payroll now"; `/company/wallets`에서 잘못된 주소로 "Add wallet"; `/worker/withdraw`에서 잔액보다 큰 금액.
2. 정산 지연: 인보이스 예약 시각이 지난 뒤 45초를 재면서 배지를 관찰(workflow 모드).
3. 환율 fallback 표시: `/login` 환율 목록 제목, 워커 홈 잔액 줄, 인보이스 발행 폼 안내 상자의 source.
4. fixed 잠금 만료: fixed 인보이스를 "Settle at" 25시간 이상 뒤로 예약한 뒤(실제 정산은 기다릴 수 없으므로) FX 카드 설명과 "Pricing" 행의 "until {datetime}"만 확인.
5. 차단/재시도: [10](#10-kyc-차단과-재시도).
6. 멱등성: 이미 승인된 인보이스의 `POST /api/invoices/{id}/approve`([17](#17-api와-데이터-리셋))를 다시 호출해도 상태가 바뀌지 않음.

### 기대 결과

- [ ] 서버 오류는 전체 화면 "That didn't go through" + 메시지("Select at least one worker", "Address must be a 0x… 40-hex address", "Insufficient balance (x.xx USDC)", "Settle or reject {n} open invoice(s) first", "Add a bank account in Settings first", "Worker not in organization", "Amount must be positive", "External address must be a 0x… 40-hex address", "Choose a paid plan") + "Try again" / "Go back". 메시지가 없으면 "Service unavailable. Check the Upstash and Workflow configuration." 이 구체 메시지는 로컬 `npm run dev`에서만 보입니다. 프로덕션(Vercel)에서는 Next.js가 Server Action 오류의 메시지를 digest로 대체하므로 항상 "The server declined the request, for example a missing wallet address or an unreachable service. Try again or go back."가 표시됩니다.
- [ ] 정산 실패 시 형태: 배지 "Failed"(빨강), 타임라인 빨간 "Failed" 행 + 오류, "Details"의 "Error" 행, 회사 알림 "Settlement failed for {worker}" / 오류 메시지, 회사 상세에 "Retry settlement"(→ `failed → scheduled`, 토스트 "Settlement restarted"). 워커 측에는 Retry 없음.
- [ ] workflow 모드 안전망: 예약 시각 + 45초가 지나면 열린 페이지의 다음 폴링(3초)에서 `/api/tick`이 정산을 시작. tick 모드는 즉시.
- [ ] 환율 fallback: 로그인 "Reference rates per USD"(라이브면 "Live rates per USD"), 워커 홈 "… · {rate} KRW/USD · fallback rate", 발행 폼 "Indicative rates (fallback): …". 기능은 그대로 동작.
- [ ] fixed 만료 경로의 표시: FX 설명 "Rate was locked at issue for 24 h; past that window settlement falls back to the market rate at send.", 정산 후라면 "Applied rate … (lock expired, market rate used)"와 회사 알림 "Rate lock expired, settled at market" / "{amount} to {worker} was locked at {rate} until {datetime}; it settled at the market rate {rate} instead."(수수료율 `feeBps`는 110으로 유지되지만 실제 `feeUsdc`는 플랜 기준: Free 1.1%, 유료 0.6% 프리미엄만).
- [ ] 차단 인보이스는 `/api/tick`이 건너뛰며 "In flight"에 계속 집계됨. KYC 차단(`blockedReason: "kyc"`) 건은 Retry 전까지 재시도되지 않습니다. 플랜 보류(`blockedReason: "plan"`) 건은 `/company/billing`에서 업그레이드하면 `upgradePlan`이 그 조직의 보류 건 전부의 플래그를 지우고 `scheduleInvoice`해 자동으로 재개됩니다(알림 "{org} is on Business" / "Unlimited sends. {n} held payouts resumed.", [12b](#12b-구독-플랜과-billing)).
- [ ] 멱등: 승인 API 재호출 응답의 상태가 그대로(`scheduled`/`confirmed`); "Retry settlement"는 `failed`, KYC 차단(워커 verified), 플랜 보류(플랜에 여유가 생긴 뒤)에서만 렌더링·효과.
- [ ] 오프보딩 중 워커의 "Offboard" 폼 숨김, 미결 인보이스가 있는 워커의 "Remove from team" 비활성.

### 내부 동작

폼은 모두 `<form action={serverAction}>`이라 액션이 던진 Error는 `src/app/error.tsx`로 올라갑니다. `settleInvoice`는 `sending` 이후 try 블록(환율, 가격, `chain.transfer`, `waitForConfirmation`, 알림)에서 예외가 나면 `failed` + `error` + `invoice_failed` 알림으로 처리하고, `retryInvoice`가 `failed → scheduled`(by "system:retry")로 되돌립니다. `/api/tick`의 grace는 `SCHEDULER=tick`이면 0, 아니면 45,000 ms(`WORKFLOW_SAFETY_NET_MS`); `settleInvoice`는 `status === "scheduled"`일 때만 진행하므로 이미 `sending`인 run과 겹치지 않습니다. 환율은 `getRates`([src/lib/fx/rates.ts](../src/lib/fx/rates.ts))가 `FX_API_URL`(기본 open.er-api.com, 2.5초 타임아웃) 실패 시 `FALLBACK_RATES`를 `source: "fallback"`으로 반환. fixed 잠금은 `priceAtSettlement`에서 `now <= lockExpiresAt`일 때만 `lockedRate` 적용, 아니면 시장 환율 + `lockExpired`. 스펙 [§8](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#8-error-handling-and-fallbacks), [§5.4](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#54-settlement-step-shared-by-both-scheduler-engines).

### 문제가 있다면

- "Service unavailable. Check the Upstash and Workflow configuration."는 저장소/Workflow 연결 문제입니다. 프로덕션은 Upstash 통합, 로컬은 `.data/kv.json` 쓰기 권한과 `.env.local`을 확인.
- Vercel에 Upstash 없이 배포하면 "Upstash Redis is not configured: connect the Upstash integration (KV_REST_API_URL / KV_REST_API_TOKEN)."로 실패합니다(파일 저장소는 Vercel에서 거부됨).
- "Failed" 뒤 Retry해도 같은 오류가 나면 "Details"의 "Error" 메시지를 보고 환경(`CHAIN_MODE=testnet`이면 `USDC_ADDRESS`, `PLATFORM_PRIVATE_KEY`, 잔액)을 확인.

---

## 17. API와 데이터 리셋

구현된 HTTP 엔드포인트는 세 개입니다. 모두 [src/app/api](../src/app/api) 아래에 있습니다.

### GET /api/tick

- 인증 없음. 헤더의 Poller가 3초마다 호출합니다(`fetch("/api/tick", {cache: "no-store"})` 후 `router.refresh()`).
- 동작: `status === "scheduled"`, `blockedReason` 없음, `scheduledAt + grace <= now`인 인보이스 중 **가장 오래된 하나**를 `settleInvoice`. grace = `SCHEDULER=tick`이면 0, 아니면 45,000 ms. 그다음 `processing` 상태로 8,000 ms 이상 지난 출금을 모두 `completed`로 바꾸고 `withdrawal_completed` 알림을 넣습니다.
- 응답:

```json
{ "settled": ["inv_xxxxxxxx:confirmed"], "withdrawalsCompleted": ["wd_xxxxxxxx"] }
```

아무것도 없으면 두 배열이 비어 있습니다. 소스: [src/app/api/tick/route.ts](../src/app/api/tick/route.ts).

### POST /api/invoices/[id]/approve

- 세션/인증 검사가 **없습니다**(`by` 기본값 "api"). Workflow 빌더가 `src/workflows/invoice.ts`를 발견하게 하는 import 체인(`src/lib/scheduler` → 이 라우트)의 끝점이기도 합니다.
- 요청 본문(JSON, 모두 선택):

```json
{ "approved": true, "by": "api", "reason": "optional reject reason" }
```

- 동작: `approveInvoice(id, by, approved, reason)` — `pending_approval`일 때만 `scheduled`/`rejected`로 전이(멱등), 상대방 알림, workflow 모드면 훅 재개. 응답은 `{ "id": "inv_…", "status": "scheduled" }` 형태(갱신된 상태만, 전체 인보이스가 아님). 존재하지 않는 ID면 `invoice {id} not found` 예외.
- 예:

```bash
curl -X POST https://settlivo.vercel.app/api/invoices/inv_xxxxxxxx/approve \
  -H "content-type: application/json" -d '{"approved":true}'
```

소스: [src/app/api/invoices/[id]/approve/route.ts](../src/app/api/invoices/[id]/approve/route.ts), [src/lib/scheduler/index.ts](../src/lib/scheduler/index.ts).

### POST /api/seed

- 헤더 `x-seed-secret`가 서버의 `SEED_SECRET`과 같아야 합니다(`SEED_SECRET` 미설정 또는 불일치 → `401 {"error":"unauthorized"}`).
- 본문(선택): `{ "flush": true }` — 기본 true. `flush: true`면 FLUSHDB 후 시드. (`flush: false`는 문서(org/worker/invoice 등)는 덮어쓰지만 알림·FX 히스토리 리스트는 LPUSH로 추가되어 중복이 생기므로 쓰지 마세요.)
- 응답:

```json
{ "counts": { "orgs": 2, "wallets": 12, "linkRequests": 1, "workers": 6, "invoices": 25, "txs": 23, "payrollRuns": 2, "withdrawals": 3, "notifications": 27, "fxHistory": 31 } }
```

- 로컬 동등 명령: `npm run seed`(= `dotenv -e .env.local -- tsx scripts/seed.ts`, 항상 flush). 시드는 PRNG seed 20261024로 결정적이라 ID·tx 해시·환율·금액은 리셋마다 같고, 날짜(`scheduledAt`, `blockNumber`)와 그에 따라 달라지는 `invoiceHash`(sha256 입력에 `scheduledAt`이 포함됨)만 리셋 시각 기준으로 바뀝니다(예: Carlos 요청 `inv_c611a9f8` = 내일 09:24 UTC, Eun 차단 건 `inv_f6e78376` = 어제 09:11 UTC).
- 소스: [src/app/api/seed/route.ts](../src/app/api/seed/route.ts), [src/lib/seed/index.ts](../src/lib/seed/index.ts), [src/lib/seed/generate.ts](../src/lib/seed/generate.ts), [scripts/seed.ts](../scripts/seed.ts). 스펙 [§7](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#7-seed-data).

### 저장소와 환경 변수

- `getRedis()`([src/lib/db/redis.ts](../src/lib/db/redis.ts)): `KV_MODE`가 `file`/`upstash`면 그대로, 아니면 `UPSTASH_REDIS_REST_*` 또는 `KV_REST_API_*`가 있으면 Upstash, 없고 `VERCEL`이면 예외, 아니면 파일(`KV_FILE` 또는 `.data/kv.json`). 모든 읽기/쓰기는 [src/lib/db/repo.ts](../src/lib/db/repo.ts)를 거칩니다.
- `CHAIN_MODE`, `SCHEDULER`는 호출 시점에 읽습니다(`chainMode()` / `schedulerMode()`). 나머지 변수 표는 [README.md "실행과 설정"](../README.md#실행과-설정), 스펙 [§10](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#10-configuration).
- 참고로 코드가 읽지만 `.env.example`에 키로 없는 변수: `KV_FILE`, `VERCEL`, `PLAYWRIGHT_BASE_URL`, `E2E_SCHEDULER`, `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`(`KV_REST_API_*`보다 우선; `.env.example`에는 주석으로만 언급). `KV_MODE`도 주석 처리된 예시 줄로만 있습니다.

---

## 18. 자동 검증 (테스트·E2E)

커밋 전 게이트([AGENTS.md](../AGENTS.md) "Verify before commit"):

```bash
npm test && npm run typecheck && npm run build
npm run e2e        # 데모 핵심 경로를 건드렸을 때
```

| 명령 | 실행 내용 | 커버 범위 |
| --- | --- | --- |
| `npm test` (`vitest run`) | `src/**/*.test.ts` 13개 파일, 58개 테스트, 약 3초 | 인보이스 상태 머신(유효/무효 전이, history); 정산(`settle.test.ts`: Free 플랜 한도 소진 시 `blockedReason: "plan"` → confirm 시 send 카운트, KYC 차단, 기본 지갑·송금 시점 토큰, spread/fixed/만료 가격, 체인 오류 → failed, approve 멱등성, 훅 실패 시 새 run); 구독 플랜(`plan.test.ts`: Free 3 sends/월·유료 무제한, 기간 만료 시 카운터 리셋·플랜 없는 조직은 Free, 플랜별 수수료); 메모 calldata 라운드트립·`invoiceHash` 안정성; 시뮬레이션 체인(pending tx + 메모, 확인 시 잔액 반영); FX 변환(6dp 내림)·가격(bps, BigInt 수수료)·환율(fallback, drift ±0.3%); FileKv 파일 저장소; 멤버십·지갑 도메인; 금액 포맷; 지연 계산 |
| `npm run typecheck` (`tsc --noEmit`) | strict 타입 검사 | 전체 `src`, `scripts`, 설정 파일 |
| `npm run build` (`next build`) | 프로덕션 빌드 + Workflow 빌드 | 라우트/서버 액션 컴파일, `"use workflow"` 파일 발견 여부(`src/workflows/invoice.ts`가 import 체인에서 빠지면 조용히 사라짐) |
| `npm run e2e` (`playwright test`) | 시드 후 `next dev -p 3100`을 띄우고 [e2e/demo.spec.ts](../e2e/demo.spec.ts)의 18단계를 직렬로 실행(단일 chromium, 테스트당 180초) | [docs/demo-script.md](demo-script.md) 1–18단계: 로그인 → 대시보드 문구 → 인보이스 발행(75초 예약) → Alice 승인·Confirmed·"Verified"·탐색기 → 출금 100 USDC(Processing → 사라짐) → Approvals 두 건 → 페이롤 "3 / 3"·"Completed" → Eun 차단·KYC 3단계·Retry → 조직 전환 → 워커 등록(Mateo Ruiz) → 조직 지갑 "Bonus pool" → Bob 오프보딩 "Former" → Alice 지갑 "Rabby" → Nordwind 페이롤 "Blocked · Plan" → Billing "Upgrade to Business" → 런 "Completed" |

E2E 환경(`playwright.config.ts`): `KV_MODE=file`, `KV_FILE=.data/kv-e2e.json`(개발용 `.data/kv.json`과 분리), `SCHEDULER=tick`(`E2E_SCHEDULER`로 덮어쓰기 가능), `CHAIN_MODE=simulated`, `SIM_CONFIRM_MS=500`, `FX_API_URL=http://127.0.0.1:9`(도달 불가 → fallback 환율 고정), `WORKFLOW_LOCAL_DATA_DIR=.workflow-data-e2e`, `WORKFLOW_LOCAL_RECOVER_ACTIVE_RUNS=0`(`workflow` 패키지가 읽는 로컬 run 저장소·복구 설정). 최초 1회 `npx playwright install chromium`. 프로덕션을 대상으로 돌리려면:

```bash
PLAYWRIGHT_BASE_URL=https://settlivo.vercel.app SEED_SECRET=… npm run e2e   # 먼저 POST /api/seed로 리셋한 뒤 같은 18단계 수행
```

유닛 테스트가 없는 영역(repo.ts, 시드, 서버 액션, 쿼리, 워크플로 파일, testnet 어댑터, React 컴포넌트)은 E2E로만 간접 검증됩니다. 수동 확인은 `npm run dev` 후 `/login`이 200, 비로그인 `/company`가 307 → `/login`인지 보는 것입니다. 스펙 [§9](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md#9-testing).

---

## 19. 전체 체크리스트

**0. 준비**
- [ ] 리셋(`POST /api/seed` 또는 `npm run seed`) 응답 counts가 orgs 2 / wallets 12 / workers 6 / invoices 25 / notifications 27
- [ ] 페이지가 3초마다 자동 갱신된다(수동 새로고침 불필요)

**1. 로그인과 페르소나**
- [ ] 비로그인 `/company` → 307 `/login`
- [ ] 로그인 목록에 관리자 2명·워커 5명, Finn Larsen 없음
- [ ] Jordan → `/company`, 헤더에 "Organization" select
- [ ] Alice → `/worker` "Hi, Alice"
- [ ] 역할 불일치 URL이 자기 홈으로 돌아온다
- [ ] "Sign out" 아이콘으로 로그아웃

**2. 회사 대시보드**
- [ ] "Treasury balance" 60,750.00 USDC, "2 wallets · Base"
- [ ] "Workers" 4, "3 verified"
- [ ] "Saved vs. bank wires" 위젯과 각주
- [ ] "Needs your attention" 3건 + "Approvals (2)"

**3. 인보이스 발행**
- [ ] Spread/Fixed 미리보기 문구와 수수료(0.5% / 1.1%)
- [ ] "Issue invoice" → 상세로 이동, 배지 "Awaiting approval"
- [ ] FX 카드 "Executed rate (at send)" = "pending", On-chain record "Appears once settlement starts."
- [ ] 워커 알림 "New invoice from Acme Remote: …"

**4. 워커 승인과 예약 정산**
- [ ] "Needs your approval (1)" → "Approve" → 토스트 "Approved" / "Email sent to the counterparty."
- [ ] 배지 "Scheduled" → 예약 시각에 "Sending" → 2–5초 뒤 "Confirmed"
- [ ] 알림 "You received … USDC" / "Settled … to Alice Kim" / "Invoice approved: …"
- [ ] 워커 잔액 증가
- [ ] 거절 경로: "Reject" → "Reason" → "Confirm reject" → "Rejected"

**5. FX 비교와 온체인 기록**
- [ ] "Quote rate (at issue)" / "Executed rate (at send)" / "Change" / "Applied rate" / "Fee" / "Settled amount"
- [ ] "On-chain record" 헤더 "Verified", Memo `SETTLIVO|inv_…|…`
- [ ] `/explorer/tx/{hash}` "Transaction details", "Method" "transfer(address,uint256) + memo", "Decoded Settlivo memo"
- [ ] 탐색기는 로그인 없이 열림

**6. 출금**
- [ ] 비교표 "Settlivo" vs "Bank wire"("$35 + 2.2% spread", "3–5 business days")
- [ ] "Withdraw to KRW" → "Processing" → 8–11초 뒤 "Completed"
- [ ] 알림 "Withdrawal completed: …" / "Funds sent to KB Kookmin ****2841."
- [ ] 잔액 차감; 은행 없는 워커는 버튼 비활성

**7. 페이아웃 설정 변경**
- [ ] 워커 "Submit for approval" → "Pending change" diff, 활성 설정 유지
- [ ] 회사 "Payout setting changes" diff → "Approve"/"Reject"
- [ ] 워커 알림 "… approved your payout settings" / "… declined your payout settings"
- [ ] "Use for payouts" → "Approval pending" 배지

**8. 워커 결제 요청**
- [ ] "Send request" → 배지 "Awaiting approval", 워커 측 승인 버튼 없음
- [ ] 회사 알림 "Payment request from …", 대시보드 "… requested payment"
- [ ] "Approve & schedule" → "Payment requests (0)", 인보이스 "Scheduled"
- [ ] 예약 시각 도달 시 정산

**9. 페이롤 런**
- [ ] KYC pending 워커는 체크 불가
- [ ] "Run payroll now" → 런 페이지 "Processing", "Settled" 0 / 3 → 3 / 3, "Completed"
- [ ] "Past runs"에 새 런; 인보이스 "Details"에 "Payroll run" 링크
- [ ] 워커 알림 "Payroll on its way: …"
- [ ] 워커 미선택 → "Select at least one worker"

**10. KYC 차단과 재시도**
- [ ] Eun 인보이스 "Blocked · KYC", 타임라인 "Blocked until worker completes KYC"
- [ ] Eun 배너 "Finish verification to receive payouts" → 3단계 → "Reviewing your documents…" → 배너 사라짐
- [ ] 알림 "You're verified" / "Eun Nguyen completed verification"
- [ ] 회사 "Retry settlement" → "Settlement restarted" → "Confirmed" + "Verified"

**11. 알림**
- [ ] 종 아이콘 미읽음 배지, 드롭다운 최근 8건, "View all"
- [ ] `/notifications` "{n} total", 일자별 그룹, 열면 모두 읽음 처리

**12. 조직 전환**
- [ ] Jordan select → "Nordwind Labs" 대시보드·워커(Alice, Dana; Former Finn)·인보이스("Fixed" 배지, 총 9건)
- [ ] Mia는 select 없이 조직명 텍스트

**12b. 구독 플랜과 Billing**
- [ ] Nordwind `/company/billing` "Current plan" "Free", "Sends this month: 3 of 3", "Limit reached…"
- [ ] Nordwind 페이롤 → 행 "Blocked · Plan", "Settled" 힌트 "held by plan limit · see Billing", 대시보드 "… · held by plan limit"
- [ ] 회사 알림 "Monthly send limit reached (3 on Free)"; 워커 "On hold: company plan limit"
- [ ] "Upgrade to Business" → "Current plan" "Business", 알림 "Nordwind Labs is on Business" / "… 2 held payouts resumed."
- [ ] 런 "Completed", "Fee" 0.00 USDC

**13. 워커 등록·제거·오프보딩**
- [ ] "Add worker" → 프로필 "Active", KYC "Pending", "Settlivo wallet" 기본, 초대 알림
- [ ] 미결 인보이스 있는 워커 "Remove from team" 비활성 + "Settle or reject … first."
- [ ] "Offboard"(10,000 PHP) → "Offboarding" → 최종 인보이스 Confirmed → "Former", "Former workers (1)"
- [ ] 알림 "Bob Reyes offboarded" / "Final payment settled"

**14. 조직 지갑**
- [ ] 관리하는 모든 조직 카드, "Default" 배지, Kind "Settlivo-custodied"/"External"
- [ ] "Add wallet"(Bonus pool) → 활성 조직에만 추가; 다른 조직은 "Switch to … in the header …"
- [ ] "Make default" → 대시보드 treasury 주소 변경
- [ ] 잘못된 주소 → "Address must be a 0x… 40-hex address"

**15. 워커 지갑과 링크 요청**
- [ ] 워커 "Add wallet"(Rabby) → 목록 + 회사 알림 "… added a wallet"
- [ ] 회사 "Send request" → 워커 알림 "… asked you to link a …", 프로필에 "Pending"
- [ ] 워커 "Add wallet and accept" → "Accepted", 회사 알림 "… linked a wallet"; "Decline" → "Declined"
- [ ] 은행 요청 "Accept"는 은행 계좌가 있어야 활성

**16. 실패 처리와 안전장치**
- [ ] 서버 오류는 "That didn't go through" 화면 + 메시지 + "Try again"/"Go back"
- [ ] workflow 모드 45초 안전망 후 정산 진행
- [ ] FX fallback 표시("Reference rates per USD", "· fallback rate", "Indicative rates (fallback)")
- [ ] "Failed" 시 "Retry settlement"로 복구 (워커 측 Retry 없음)
- [ ] fixed 잠금 만료 문구와 알림 형태

**17. API**
- [ ] `GET /api/tick` → `{settled: [], withdrawalsCompleted: []}`
- [ ] `POST /api/invoices/{id}/approve` 멱등
- [ ] `POST /api/seed` 헤더 없이 401, 있으면 `{counts: …}`

**18. 자동 검증**
- [ ] `npm test` 13 files / 58 tests pass
- [ ] `npm run typecheck`, `npm run build` 통과
- [ ] `npm run e2e` 18단계 통과
