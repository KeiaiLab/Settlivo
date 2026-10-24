# Settlivo 제품 로드맵 — 구독제 + 하이브리드 정산 레일 + Payout Pool

작성일 2026-10-24. 이 문서는 **아직 구현하지 않은** 방향을 적습니다.
현재 동작은 [설계 스펙](superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md)이,
시장 근거와 지역별 진입 순서는 [시장·경쟁 분석](research/2026-10-24-market-competitive-analysis.md)이
기준입니다. 두 문서에 있는 내용은 여기서 반복하지 않고 절 번호로 가리킵니다.
단계 하나를 착수할 때 그 단계의 "스펙 변경" 항목을 스펙에 반영하고, 끝나면
이 문서에서 해당 단계를 지웁니다.

## 1. 방향

건별 수수료(스펙 §5.2: spread 0.5 %, fixed 1.1 %)를 버리고 **보내는 계정이
월 정액을 내면 송금 횟수에 제한이 없는** 모델로 갑니다. 받는 쪽은 언제나
무료입니다.

근거는 분석 §0-4항과 §4 표 5번입니다. 수령자 쪽 실제 경쟁자가 Wise(0.5 %)라서
"더 싸다"는 메시지가 약하고, 경쟁사의 정액 수수료(출금 $2.50~$30)가 소액 반복
급여에서 불만을 만듭니다. 구독제는 이 둘을 한 번에 뒤집습니다. 단 이 논리가
성립하려면 송금 한 건의 한계비용이 0에 가까워야 하므로, 정산 레일을 아래처럼
두 갈래로 나눕니다.

| 레일 | 조건 | 비용 | 확정 |
| --- | --- | --- | --- |
| internal | 수신자 기본 지갑이 `platform` | 0 | 즉시 |
| onchain | 수신자 기본 지갑이 `external` | Base 가스(≈ $0.01) | 2~5 초 |

internal 레일의 원장은 하루 한 번 Merkle 루트만 체인에 기록(앵커링)해
증빙을 유지합니다. 체인에 올라가는 서비스 데이터는 해시뿐입니다. 분석 §5
표의 "급여 금액 노출" 항목이 이 설계로 함께 해결됩니다.

구독·레일과 별도로, 지급 **시점**의 유연성도 다음 핵심 기능으로 둡니다.
회사가 워커별 Payout Pool에 자금을 넣고 시급·일급을 정하면 워커가 지급일과
무관하게 쌓인 급여를 Claim하는 모델입니다(5단계). 월 지급일 하나에 묶인
경쟁사 급여 흐름과 가장 눈에 띄게 갈리는 지점이라 데모 다음 단계에서
가장 먼저 보여 줄 후보입니다.

## 2. 원칙

- **구독이 덮는 것은 USDC 전송뿐.** 오프램프(§5.7, 0.5 %)와 환율 고정
  애드온(§5.2 fixed, 1.1 %)은 구독 밖에 둡니다. 둘 다 플랫폼이 실제 비용이나
  위험을 지는 항목입니다.
- **과금 주체는 발신자.** 회사(Org)든 개인(Worker)이든 보내는 계정에 플랜이
  붙습니다. 계정 종류는 KYC 단계, 월 한도, 요금만 바꾸고 흐름은 같습니다.
- **상태 기계는 바꾸지 않는다.** 플랜 한도 초과는 KYC 차단(§5.8)과 같은
  패턴(`scheduled`에 머물며 플래그 + 알림 + Retry)으로 처리합니다.
- **스펙 우선.** 각 단계는 스펙 절을 먼저 고치고 코드가 따릅니다(AGENTS.md
  "Source of truth").

## 3. 플랜 (초안)

| 플랜 | 계정 | 월 요금 | internal 송금 | onchain 송금 | 포함 |
| --- | --- | --- | --- | --- | --- |
| Free | 개인·회사 | $0 | 월 3건 | 가스 실비 | 받기 무제한, KYC |
| Pro | 개인 | $9 | 무제한 | 무제한 | 개인→개인 송금(4단계) |
| Business | Org | $99 | 무제한 | 무제한 | 페이롤 런, 승인, 감사 증빙, 다중 지갑 |

요금은 데모용 가정입니다. 검증은 분석 §6-4항의 인터뷰에 "월 송금 건수와
현재 지불 중인 수수료 총액" 질문을 추가해서 합니다. 손익분기 가늠: Business
$99는 Wise 0.5 % 기준 월 $19,800 송금액과 같습니다. 그 이하를 보내는 회사는
구독이 손해이므로 Free 한도(3건)와 Business 사이에 팀 플랜이 필요한지 인터뷰로
확인합니다.

## 4. 단계

### 0단계 — 데모 (현재, 2026-10)

1단계(구독 과금 모델)는 2026-10-24에 출시되어 이 문서에서 지웠습니다. 현재
동작은 스펙 §5.2 Plans, §5.4, §6 `/company/billing`, §7 시드를 봅니다. 발표
덱에는 "다음 단계: 내부 레일 + 앵커링" 슬라이드 한 장만 추가합니다. 내용은 이
문서 §1 표와 §3 표입니다.

### 2단계 — internal 레일

**목표**: platform 지갑끼리의 정산이 체인 전송 없이 즉시 확정됩니다.

- 데이터: `ledger:{id}` = `{ id, from: {type,id}, to: {type,id}, amount,
  invoiceId, at }`, Set `ledger`, 인덱스 `{org|worker}:{id}:ledger`.
  `invoice.rail: internal|onchain`, `invoice.ledgerEntryId?`.
- 정산 스텝(§5.4): 수신 지갑 로드 뒤 `kind`로 레일 분기. internal은 원장
  항목 쓰기 + 양쪽 `usdcBalance` 갱신을 repo 한 함수에서 처리하고 바로
  `confirmed`. onchain은 현행 유지.
- 화면: 인보이스 상세와 페이롤 런 행에 레일 배지. 페이롤 런에서
  Alice(platform)는 즉시, Bob(external)은 2~5 초 뒤 확정되어 차이가 보입니다.
  internal 인보이스의 On-chain record 카드는 3단계 전까지 "Ledger entry
  #… (anchor pending)"으로 표시.
- 스펙 변경: §3 아키텍처(레일 설명), §4 모델, §4.1 온톨로지 마지막 문단,
  §5.4, §5.5, §5.6(internal은 앵커로 대체된다는 단서), §7 시드 잔고.
- 완료 기준: 단위 테스트(레일 선택, 원장 원자성, 잔고 합 불변), e2e 페이롤
  장면에서 두 레일 모두 confirmed.
- 의존: 없음. 플랜 검사(스펙 §5.4)는 이미 정산 스텝에 있으므로 레일 분기는
  그 뒤에 둡니다.

### 3단계 — 앵커링

**목표**: internal 원장도 체인에서 검증됩니다.

- 데이터: `anchor:{id}` = `{ id, root, txId, entryIds[], from, to,
  createdAt, confirmedAt }`, Set `anchors`. `invoice.anchorId?`.
- 처리: `/api/tick`에 "미앵커 원장 항목이 있고 마지막 앵커가 N분 전이면
  앵커 생성" 추가(데모는 N=5, 운영은 하루 1회). 앵커 tx는 플랫폼 지갑의
  자기 자신 앞 0-전송에 메모 코덱(§5.6) 재사용: `SETTLIVO|ANCHOR|{root}`.
  Merkle 트리는 leaf = sha256(ledger 항목 JSON 정규화), 정렬 쌍 해시.
- 화면: internal 인보이스의 On-chain record 카드가 "Ledger entry → Anchor
  #N → Verified"로 바뀌고 Merkle proof를 서버에서 재계산. 탐색기에
  `/explorer/anchor/[root]`(루트, tx, 포함 항목 수, 구간). `/company/billing`
  에 "Anchor now" 버튼(데모 편의).
- 스펙 변경: §4 모델, §5.6 제목을 "On-chain record and anchoring"으로
  바꾸고 두 경로 서술, §6 라우트, §8 오류(앵커 tx 실패 시 다음 틱에 재시도,
  원장은 영향 없음).
- 완료 기준: 단위 테스트(루트 계산, proof 검증, 항목 하나 바꾸면 Mismatch),
  e2e에서 Alice 인보이스가 앵커 뒤 Verified.
- 의존: 2단계.

### 4단계 — 개인→개인 송금

**목표**: 회사 없이 개인이 다른 Settlivo 사용자에게 보냅니다. Pro 플랜의
존재 이유입니다.

- 데이터: `invoice.orgId`를 optional로. 발신자가 Worker인 인보이스는
  `initiatedBy: worker`, `senderWorkerId`, pre-approved, `scheduledAt = now`.
  인덱스 `worker:{id}:sent`.
- 화면: `/worker/send`(수신자 이메일 또는 핸들, 금액, 메모, 레일과 예상
  확정 시간 미리보기). `/worker` 홈에 "Sent" 목록. 수신자는 기존 알림과
  인보이스 상세를 그대로 씁니다.
- 영향 범위: `orgId`를 전제한 코드(쿼리, 알림 수신자, 해시 입력 §5.6,
  탐색기 from 주소)를 전부 손봐야 해서 네 단계 중 가장 넓습니다. 그래서
  마지막입니다.
- 스펙 변경: §2 페르소나(개인 발신 예시), §4 모델, §4.1 온톨로지(Worker가
  Invoices를 "issues"), §5.3 끝 문단, §6 라우트, §7 시드(Alice → Carlos 1건).
- 완료 기준: e2e에 Alice가 Carlos에게 보내는 장면, Free 한도 소진 시 플랜
  차단(스펙 §5.4)이 그대로 동작.
- 의존: 2단계. 3단계와는 독립.

### 5단계 — Payout Pool (유연 지급: 시급·일급 수시 수령)

**목표**: 회사가 워커별로 **Payout Pool**(지급 풀)에 자금을 넣고 시급·일급을
정해 두면, 워커는 지급일을 기다리지 않고 그때까지 쌓인 급여를 원할 때
자기 지갑으로 **Claim**합니다. 지급 한 건마다 기존과 같은 인보이스·tx·메모가
남습니다. 데모에서는 "받을 수 있는 금액"이 화면에서 실시간으로 올라가고,
워커가 Claim을 누르면 2~5 초 뒤 confirmed 되는 장면이 핵심입니다.

**개념과 명칭** (검토한 후보: Stream wallet, Allowance wallet, Escrow wallet)

| 용어 | 뜻 |
| --- | --- |
| Payout Pool (지급 풀) | Org가 소유한 지갑의 한 종류(`kind: pool`). 워커 한 명(membership)당 최대 하나. Org 기본 지갑(treasury)에서 **Top up**으로 채웁니다. |
| Pay rate | 회사가 Pool에 붙이는 적립 규칙 `{ unit: hour \| day, amount, currency }`. 통화는 워커 현지 통화. |
| Accrued | Pay rate를 켠 시점(`startedAt`)부터 경과 시간 × rate로 **자동 적립**된 금액. 회사가 Pause 하면 멈추고 Resume 하면 이어집니다. 타임시트 입력은 없습니다(데모 단순화, §6 미결 참고). |
| Claimable | `min(accrued − claimed, Pool 잔고의 현지 통화 환산액)`. 워커가 가져갈 수 있는 상한. |
| Claim | 워커가 Claimable 안에서 금액을 정해 받는 행동. pre-approved 인보이스 한 건이 되어 §5.4 정산 스텝을 그대로 탑니다. |

Escrow는 "조건 충족 시 해제"로 읽혀 제외했고, Stream은 자동 푸시 느낌이라
워커가 시점을 고르는 이 설계와 맞지 않아 제외했습니다.

- 데이터: `wallet.kind`에 `pool` 추가, `wallet.poolFor: workerId`,
  `wallet.payRate?: { unit, amount, currency, startedAt, pausedAt?,
  accruedBeforePause }`. `invoice.kind?: pool_claim`,
  `invoice.sourceWalletId?`(지급 재원 지갑; 없으면 Org 기본 지갑, 현행과
  동일). `topup:{id}` = `{ id, orgId, fromWalletId, toWalletId, usdcAmount,
  at }`, 인덱스 `org:{id}:topups`. Claimed 합계는 해당 Pool의 confirmed
  `pool_claim` 인보이스 합으로 계산하고 저장하지 않습니다.
- 적립 계산(순수 함수, 단위 테스트 대상): `accrued(payRate, now)` =
  `accruedBeforePause + (now − startedAt 또는 마지막 resume) × rate`.
  hour는 분 단위로 비례 배분, day는 자정 기준 경과 일수가 아니라 24 시간
  단위 비례 배분(데모에서 숫자가 움직여 보여야 하므로).
- Claim 흐름: 워커가 금액 입력(기본값 = Claimable 전액) → 현지 통화
  금액의 인보이스 생성(`initiatedBy: worker`, `kind: pool_claim`,
  `sourceWalletId = pool`, `scheduledAt = now`, 승인 생략, `rateMode:
  spread`) → `scheduleInvoice`. 환율·수수료·6 dp 내림은 §5.2 그대로.
- 정산 스텝(§5.4): `wallet = invoice.sourceWalletId ?? org 기본 지갑`으로
  from 주소를 정합니다. Pool 잔고 < usdcAmount + feeUsdc 이면 KYC 차단과
  같은 패턴으로 `scheduled`에 머물며 `blocked_pool_balance` 플래그, 회사
  알림 `pool_low_balance`. Top up 뒤 Retry. 상태 기계는 바꾸지 않습니다.
- 화면:
  - `/company/workers/[id]`: "Flexible pay" 카드. Enable(단위·금액 입력 →
    Pool 지갑 생성) · Top up(treasury에서 금액 이동) · Pause / Resume ·
    Accrued / Claimed / Pool balance · 최근 Claim 목록.
  - `/company/wallets`: Pool 지갑이 "Pool · Carlos Mendes" 라벨로 Org
    아래에 잔고와 함께 나열. Top up 버튼.
  - `/worker` 홈: "Available now" 카드 — 적립액이 3 초 폴링마다 올라가고,
    "₩25,000 / hour · Acme Remote" 식으로 rate 표시. **Claim** 버튼 → 금액
    입력 → 인보이스 상세로 이동, 타임라인이 Scheduled → Sending →
    Confirmed로 진행. 375 px에서 가장 먼저 보이는 카드로 둡니다.
  - 인보이스 상세(양쪽): "Pool claim" 배지, 재원 지갑 표시. On-chain record
    카드는 from 주소가 Pool 지갑인 것만 다릅니다.
  - 알림(§5.9): `pool_enabled`(워커), `pool_topped_up`(워커),
    `pool_claimed`(회사), `pool_low_balance`(회사), `pool_paused`(워커).
- 시드(§7): Acme가 Carlos에게 hourly BRL rate를 3 일 전에 켜 둔 상태,
  Pool 잔고 있음, 과거 Claim 1건 confirmed. Nordwind는 Pool 없음(기능이
  선택적임을 보여 줍니다).
- 스펙 변경: §4 모델(wallet·invoice·topup), §4.1 온톨로지(Org "owns Payout
  Pools per membership", Worker "claims from Pools"), §5.4 의사코드(재원
  지갑, 잔고 차단), §5.9 알림, §5.12 지갑 종류, 새 절 §5.13 Payout Pool,
  §6 라우트(워커 홈 카드, 워커 상세 카드), §7 시드, §8 오류(잔고 부족).
  README 기능표와 튜토리얼에 섹션 추가, demo-script에 "Jordan: Carlos
  Flexible pay 켜고 Top up → Carlos: Claim → confirmed" 장면.
- 완료 기준: 단위 테스트(적립 계산, pause/resume, Claimable 상한, 잔고
  부족 차단 → Top up → Retry). `npm run e2e`에 위 장면. Pool 잔고 +
  Claim 합 + 수수료 합 = Top up 합 불변.
- 의존: 없음(0단계 코드 위에 바로 가능). 2단계와 결합하면 platform 지갑으로
  가는 Claim은 internal 레일로 즉시 확정되어 "시급 단위 즉시 지급"
  메시지가 완성됩니다. Claim 1건을 구독 플랜(스펙 §5.2)의 송금 1건으로
  셀지는 §6 미결.

### 6단계 — 실자금 전환 전제조건

분석 §5 표와 §6-5항(이중 지급 방지, 환율 고정, 비수탁 또는 라이선스 위탁)은
그대로 선행 조건입니다. 구독·하이브리드 모델이 **추가로** 요구하는 것만 적습니다.

- 옴니버스 지갑 대사: internal 원장 잔고 합계 = 옴니버스 지갑 온체인 잔고를
  앵커마다 확인하고 차이가 나면 앵커를 멈춥니다.
- 결제 수단: 구독료 청구(카드·계좌이체) 공급자. Vercel Marketplace 결제
  통합 중에서 고릅니다. 가상자산이 아닌 SaaS 요금이라 분석 §6-1항의
  정부지원사업 업종 제외 회피 논리와 맞습니다.
- 플랜별 AML 한도: Free는 월 송금액 상한, Pro·Business는 KYC 단계에 따라
  상한. 수탁 구조에서 한도는 라이선스 파트너 요건을 따릅니다.
- 앵커 비용: 하루 1회 Base 가스는 무시할 수준이지만 체인 장애 시 원장은
  계속 돌고 앵커만 밀리므로, "마지막 앵커로부터 경과 시간"을 운영 지표로
  둡니다.

## 5. 하지 않기로 한 것

| 안 | 이유 |
| --- | --- |
| 구조화된 온체인 이벤트(인보이스 레지스트리 컨트랙트) | 발신·수신·금액이 공개 명세가 됩니다. 분석 §5 표의 급여 노출 문제를 키웁니다. 해시와 앵커로 충분합니다. |
| 암호화 payload + IPFS 포인터 | 프라이버시와 증빙을 다 얻지만 데모 범위를 넘습니다. 6단계 이후 재검토. |
| 환율 고정·오프램프를 구독에 포함 | 플랫폼이 환율 위험과 파트너 비용을 집니다. 월 지급액 상한이나 티어가 필요해져 "무제한"이 거짓말이 됩니다. |
| 근무자 수당(seat) 과금 | Deel·Remote와 같은 모델이라 차별점이 사라집니다. |
| 수령자 과금 | 급여 수령자에게 구독을 팔기 어렵고 네트워크 효과를 막습니다. 받기는 무료로 고정합니다. |
| 전송마다 퍼블릭 체인(현행 유지 + 과금만 교체) | 변경은 가장 적지만 건당 가스와 2~5 초 확정이 남아 "무제한·즉시"의 근거가 약합니다. |
| 내부 원장만(앵커 없음) | 수탁자이면서 체인 증빙도 없어 "블록체인을 쓰는 이유"에 답할 수 없습니다. |
| 온체인 스트리밍 프로토콜(Superfluid류)로 시급 지급 | 초 단위 스트림은 보기엔 좋지만 체인 종속이 생기고 급여 흐름이 공개됩니다. 5단계의 Pool + Claim이 같은 사용자 가치를 해시·앵커 구조 안에서 줍니다. |
| Pool에서 매시간 자동 푸시 송금 | tx 수가 폭증하고 워커가 받을 시점을 고를 수 없습니다. 적립은 자동, 송금은 워커의 Claim으로 둡니다. |

## 6. 미결

- 플랜 요금과 Free 한도 숫자(§3). 인터뷰 전까지 가정.
- 팀 플랜(Business 아래 티어) 필요 여부.
- Free 계정의 onchain 송금 가스를 실비로 받을지, 플랫폼이 흡수하고 한도로만
  막을지.
- 앵커 주기를 시간 기준으로 할지 항목 수 기준으로 할지.
- 개인→개인 송금에서 수신자를 이메일로 찾을지 별도 핸들을 둘지.
- Payout Pool(5단계) 적립을 시간 경과만으로 할지, 워커 타임시트 입력이나
  회사 승인을 거치게 할지. 데모는 시간 경과형.
- Pool Claim을 구독 플랜(스펙 §5.2)의 송금 건수에 포함할지.
- Pool 한 개를 여러 워커가 공유하는 "팀 Pool"이 필요한지(현재 설계는
  워커당 하나).
