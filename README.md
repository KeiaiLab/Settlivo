# Settlivo

> 스테이블코인과 블록체인으로 해외 기업과 원격 근무자 간 복잡한 대금 지급 절차를 간소화하고, 송금 시간과 수수료를 줄이는 글로벌 정산 플랫폼.

## 한 줄 아이디어

스테이블코인과 블록체인으로 해외 기업과 원격 근무자 간 복잡한 대금 지급 절차를 간소화하고, 송금 시간과 수수료를 줄이는 **글로벌 정산 플랫폼**.

## 타깃 해외 시장

| 구분 | 대상 |
| --- | --- |
| **기업 고객** | 해외 글로벌 원격 채용 기업 |
| **근무자 고객** | 해당 기업에서 일하며 해외 급여를 받는 개발자·디자이너 등 원격 근무자 |

## 해결하려는 문제

- **복잡한 지급 절차** — 국가마다 다른 은행·송금 체계로 인해 해외 근무자에게 급여를 지급하는 과정이 번거로움
- **긴 송금 시간** — 국제 은행 송금은 도착까지 수일이 걸리는 경우가 많음
- **높은 수수료** — 중개 은행 수수료와 환전 비용이 누적되어 근무자가 실제 받는 금액이 줄어듦

## 솔루션

- **스테이블코인 기반 지급** — 가치가 안정적인 스테이블코인으로 국경과 관계없이 급여·대금 지급
- **블록체인 정산** — 중개 기관을 줄여 송금 시간을 단축하고, 지급 내역을 투명하게 기록
- **통합 정산 플랫폼** — 기업은 여러 국가의 근무자에게 한 곳에서 일괄 지급, 근무자는 간편하게 수령

## 기대 효과

- 기업: 해외 급여 지급 업무 간소화 및 운영 비용 절감
- 근무자: 더 빠르고 저렴하게 급여 수령

## Demo

- Production: https://settlivo.vercel.app (auto-deploys from `main`)
- Walkthrough: [docs/demo-script.md](docs/demo-script.md)
- Design spec: [docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md](docs/superpowers/specs/2026-10-24-settlivo-demo-mvp-design.md)

## Stack

Next.js (App Router) · shadcn/ui · Upstash Redis (Vercel Marketplace) · Vercel Workflow (durable scheduling) · viem (Base Sepolia USDC, optional) · Vitest

| Env | Values | Default |
| --- | --- | --- |
| `CHAIN_MODE` | `simulated` \| `testnet` | `simulated` |
| `SCHEDULER` | `workflow` \| `tick` | `workflow` |
| `SEED_SECRET` | any string; protects `POST /api/seed` | — |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | from the Upstash integration (`UPSTASH_REDIS_REST_*` also accepted) | — |
| `KV_MODE` | `auto` \| `file` \| `upstash`; `file` = JSON store at `.data/kv.json`, used automatically when no Upstash vars are set | `auto` |
| `FX_API_URL` | keyless FX endpoint returning `{ rates }` per 1 USD | open.er-api.com |
| `SIM_CONFIRM_MS` | simulated chain confirmation delay (ms) | random 2–5 s |
| `BASE_SEPOLIA_RPC_URL`, `PLATFORM_PRIVATE_KEY`, `USDC_ADDRESS` | testnet mode only | — |

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: without Upstash vars the app uses .data/kv.json
npm run seed                 # flush + seed demo data into Redis
npm run dev
npm test && npm run typecheck && npm run build
npm run e2e                  # Playwright walkthrough of docs/demo-script.md (needs: npx playwright install chromium)
```

Contributor rules live in [AGENTS.md](AGENTS.md).
