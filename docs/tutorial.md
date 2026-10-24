# Settlivo 튜토리얼 — 10분 핵심 기능 가이드

심사 시간에 맞춰 **핵심 기능 7개**만 한 흐름으로 확인합니다. 발표용 대본은 [docs/demo-script.md](demo-script.md), 제품 설명과 설정은 [README.md](../README.md), 동작의 기준은 [설계 스펙](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md)입니다.

## 준비

- 주소: https://settlivo.vercel.app (로컬은 `npm run seed && npm run dev` → http://localhost:3000)
- 로그인은 비밀번호 없이 이름을 클릭합니다. 이 가이드는 **Jordan Lee**(Acme Remote 회사 관리자), **Alice Kim**(한국 워커, KRW), **Eun Nguyen**(베트남 워커, KYC 미완료) 세 명만 씁니다.
- 화면은 3초마다 자동 갱신됩니다. 새로고침하지 않아도 상태가 바뀝니다.
- 데이터를 처음 상태로 되돌리려면:

```bash
curl -X POST https://settlivo.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET" -d '{"flush":true}'
```

따옴표 안의 영문은 화면에 보이는 라벨 그대로입니다.

## 1. 인보이스 발행

**Jordan Lee로 로그인** → 대시보드에서 "New invoice".

1. "Worker"에서 "Alice Kim · KR · KRW" 선택
2. "Amount (local currency)"에 `4200000`
3. "Rate"는 "Spread · market rate at send · 0.5% fee" 그대로 (고정 환율을 보려면 "Fixed · lock today's rate for 24 h · 1.1% fee")
4. "Settle at"은 기본값(지금 + 2분) 유지, "Memo"에 `October salary` → "Issue invoice"

확인
- 상세 페이지 배지 "Awaiting approval", 타임라인 첫 단계 "Issued"
- "FX & settlement amount" 카드에 견적 환율과 USDC 환산액, 수수료

## 2. 승인과 자동 정산

**로그아웃 → Alice Kim으로 로그인.**

1. 홈의 "Needs your approval (1)" 카드에서 "Approve"
2. 토스트 "Approved" 확인 후 "Upcoming"의 건을 클릭해 상세를 열어 둡니다
3. 예약 시각(약 2분)까지 기다립니다

확인
- 배지 "Scheduled" → "Sending" → 2~5초 뒤 "Confirmed"
- 종 아이콘 알림 "You received … USDC", 홈 "Available balance" 증가
- Jordan에게도 "Invoice approved", "Settled … to Alice Kim" 알림이 갑니다

## 3. 온체인 검증

같은 인보이스 상세(Alice)에서.

1. "On-chain record" 카드 헤더가 "Verified"인지 확인
2. "Tx hash"를 클릭해 탐색기(`/explorer/tx/0x…`)로 이동
3. "Input data"의 "Decoded Settlivo memo"에서 "Invoice"가 방금 건의 ID와 같은지 확인

확인
- 메모 형식 `SETTLIVO|inv_…|{sha256}`, 상세의 "Invoice hash"와 일치해야 "Verified"
- "Method"는 "transfer(address,uint256) + memo", "From"은 Settlivo treasury

## 4. 출금

**Alice** 홈에서 "Withdraw to KRW".

1. "Amount (USDC)"에 `100`
2. 비교표에서 "Settlivo"와 "Bank wire" 열을 봅니다 (수수료 0.5% vs $35 + 2.2%, 도착 ~10분 vs 3–5 영업일)
3. "Withdraw to KRW"

확인
- "History" 맨 위에 "Processing" → 약 8초 뒤 "Completed"
- 알림 "Withdrawal completed", 홈 잔액 100 USDC 감소

## 5. 페이롤 런

**로그아웃 → Jordan Lee로 로그인** → 상단 "Payroll".

1. "New payroll run"에 워커별 금액이 마지막 정산액으로 채워져 있습니다 (Eun은 "KYC pending"이라 제외)
2. "Run payroll now"

확인
- 런 페이지 "Settled 0 / 3" → 행이 하나씩 "Sending" → "Confirmed" → "3 / 3", 헤더 배지 "Completed"
- "Total USDC"와 "Saved vs bank wires" 합계
- "Payroll"로 돌아가면 "Past runs" 맨 위에 방금 런

## 6. KYC 차단과 재시도

**Jordan** → "Invoices" → "Eun Nguyen" 행 배지 "Blocked · KYC" 확인.

1. 로그아웃 → **Eun Nguyen으로 로그인** → 주황 배너 "Finish verification to receive payouts"의 "Continue"
2. "Residential address" → "Continue", "Tax information" → "Continue" (값은 미리 채워져 있음)
3. "Reviewing your documents…" 약 3초 → 배너가 사라지고 부제가 "Verified"
4. 로그아웃 → **Jordan Lee** → Eun 인보이스 상세 → "Retry settlement"

확인
- 토스트 "Settlement restarted" → 수 초 내 "Confirmed", On-chain record "Verified"
- Eun 알림 "You received … USDC"

## 7. 조직 전환과 구독 플랜

**Jordan** 헤더의 조직 선택에서 "Nordwind Labs".

1. 대시보드가 Nordwind 재무로 바뀌고 Alice가 두 번째 이력으로 보입니다
2. "Billing": "Current plan" "Free", "Sends this month: 3 of 3" (한도 소진)
3. "Payroll" → "Run payroll now" → 두 행이 "Blocked · Plan"으로 보류
4. "Billing" → "Business" 칸의 "Upgrade to Business" (결제는 시뮬레이션)

확인
- "Current plan" "Business", 알림 "Nordwind Labs is on Business" / "2 held payouts resumed."
- 런 페이지로 돌아가면 두 행이 "Confirmed", "Fee" "0.00 USDC"

## 더 보기

시간이 남을 때 볼 수 있는 기능입니다. 자세한 흐름은 [데모 스크립트](demo-script.md) 14–18단계와 스펙 §5.3, §5.9, §5.11, §5.12, §8을 보세요.

| 기능 | 누구로 | 어디서 |
| --- | --- | --- |
| 워커의 지급 설정 변경 승인(diff 뷰), 워커 결제 요청 승인 "Approve & schedule" | Jordan | "Approvals" |
| 워커가 결제 요청 보내기 "Send request" | Alice | "Request payment" |
| 알림 전체 목록 | 모두 | 종 아이콘 → "View all" |
| 워커 등록 "Add worker", 퇴사 처리 "Offboard"(최종 정산 후 "Former") | Jordan | "Workers" |
| 조직 지갑 추가·기본 지갑 변경 "Make default" | Jordan | "Wallets" |
| 워커 지갑 추가, 회사의 지갑·은행 연결 요청 수락/거절 | Alice | "Settings" |
| 정산 실패 시 "Retry settlement", 45초 이상 지연된 건은 자동 재처리 | Jordan | 인보이스 상세 |
| 자동 검증: 단위 테스트 `npm test`, 데모 전체 E2E `npm run e2e` | 개발자 | 터미널 |

문제가 생기면: 상태가 멈춘 듯하면 페이지를 열어 둔 채 1분만 기다립니다(안전망이 보류 건을 처리). 데이터가 꼬이면 위의 리셋 명령을 다시 실행합니다.
