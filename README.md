# RitVizier

A Dutch vehicle lookup application. Next.js renders the interface; FastAPI fetches and normalizes official RDW Open Data. Recent searches, favourites and comparison selections stay in the browser. No account or analytics is required.

## Project documentation and versions

Read [Contributing](CONTRIBUTING.md) for branches, commits, checks and releases. [Architecture](docs/architecture.md) maps code and data flow; [Developer handoff](docs/handoff.md) records current behavior and maintenance priorities. [Verification](docs/verification.md) records completed checks and limits. Coding agents should read [AGENTS.md](AGENTS.md) before editing.

`main` holds integrated work. New tasks use their own branch and merge commit. Annotated tags identify checked snapshots; `v1.0.0` is the first tagged baseline. See the [Changelog](CHANGELOG.md). History, branches and release tags are backed up in [GitHub](https://github.com/twanterstappen/ritvizier).

The [extended RDW implementation](docs/extended-rdw-check.md) documents APK history, technical arrays, analysis, source caching, API additions and the original specification.

## Development

Requirements: Node.js 22.12+, Python 3.12+, npm. PostgreSQL 16+ is optional for durable cache storage. Without a database, the backend uses a bounded in-memory cache.

```powershell
npm ci
python -m venv .venv
.venv\Scripts\python -m pip install -e "backend[dev]"
Copy-Item .env.example backend/.env
Copy-Item .env.example frontend/.env.local
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

In another terminal, run `npm run dev` and open http://localhost:3000.

For a phone or another device on the same network, use the computer's IPv4 address on port 3000, for example `http://192.168.50.205:3000`. The development server listens on all interfaces and allows its local interface addresses for Next.js development assets and live updates. Restart it after a network-address change. With the development server running, `node scripts/check-lan.mjs http://192.168.50.205:3000` checks network access, input and lookups in Chromium and WebKit.

The frontend proxies `/api/vehicles/:plate`, `/api/costs` and `/api/road-tax` to FastAPI. Domain logic belongs to Python. The aggregate combines registration, all fuel/body records, body specifications, classes, axles, APK notifications/defects and descriptions, odometer explanations, exact recalls and separate possible model campaigns. Type approvals match the complete approval number, variant and execution code. Conflicts do not become guessed specifications. The pure analysis service adds date/status warnings and observed-history counts.

## Configuration

`BACKEND_URL` configures the server-only proxy. `NEXT_PUBLIC_SITE_URL` sets canonical URLs. `DATABASE_URL` enables PostgreSQL cache persistence. `CACHE_TTL_SECONDS` defaults to six hours. `CORS_ORIGINS` is a comma-separated allowlist. `RATE_LIMIT_PER_MINUTE` controls the per-process IP limiter. Root environment files are examples; place actual configuration in `backend/.env` and `frontend/.env.local`. No API key is needed for RDW.

`RDW_APP_TOKEN` optionally supplies a server-only SODA token. Empty tokens are omitted. `RDW_TIMEOUT_SECONDS` defaults to eight seconds, with a total per-query budget including slot waiting. `APK_NOTICE_DAYS`, `APK_URGENT_DAYS` and `RECENT_REGISTRATION_DAYS` default to 60, 30 and 30. Source TTLs are fixed in the allowlisted client registry; the aggregate cannot outlive a source's expiry.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
.venv\Scripts\python -m pytest backend/tests
.venv\Scripts\python -m ruff check backend
.venv\Scripts\python -m mypy backend/app
```

End-to-end tests require a production build first. Playwright starts an isolated frontend on port 3100 and fixture API on port 8001. These never replace the normal RDW provider. Fixture records are snapshots fetched on 6-7 October 2026. Screenshots live in ignored `artifacts/`. Run `scripts/smoke-test.ps1` with the normal API to verify the live path separately.

## PostgreSQL and containers

For automatic production deployment after all GitHub checks pass, follow [VPS deployment](docs/deployment.md). It documents the SSH secrets, repository variables, one-time VPS setup, HTTPS proxy, persistent database and rollback behavior. Production uses `deploy/compose.yml`; the root Compose file below remains the local development stack.

For local Docker, copy `.env.example` to an ignored root `.env` and set `POSTGRES_PASSWORD` to a random hex value, for example generated with `openssl rand -hex 32`. Then `docker compose up --build` starts PostgreSQL, FastAPI and Next.js. There is no built-in database password. Backend migrations run before the API starts. For manual migration, run `alembic upgrade head` from `backend/` with `DATABASE_URL` configured. Production frontend: `npm run build` then `npm start`.

## Data and calculations

Missing values remain null. Source metadata records section status, retrieval dates, datasets and unavailable fields. kW-to-hp, import, age and countdown are derived; official payload takes precedence over a labeled calculation. Both colors, registration/WAM, odometer judgment, execution/transmission, recalls and separate WLTP/NEDC figures appear. APK notifications and defects have a chronological timeline with official descriptions; absent records are not proof of a clean inspection or no damage. Exact mileage, complete inspection/maintenance history, owner counts, market values and all commercial packages remain unavailable.

Running costs prefill RDW WLTP consumption (NEDC fallback). Insurance, maintenance, distance and energy price remain editable assumptions. Road tax uses official provincial passenger-car tables from the Belastingdienst calculator. The checked snapshot in `backend/app/data/road_tax_2026.json` is valid July–December 2026 and uses **massa rijklaar**, not empty mass. Petrol hybrids pay the normal rate; fully electric/hydrogen cars use 70% of the petrol quarterly amount, rounded down exactly as the live calculator does. Its legacy EV table column is deliberately unused. Diesel needs an explicit particulate-surcharge choice; LPG needs the registered installation class. Unsupported categories, missing weight, oldtimer cases and dates outside validity return an unavailable reason, never a guessed zero. The frontend labels the total as excluding road tax until it is known; manual override remains possible. Estimates exclude personal exemptions, suspension, depreciation, financing and purchase costs.

To refresh the reviewed snapshot, run `.venv\Scripts\python backend/scripts/update_road_tax.py`. It parses only numeric assignments from the official public asset without executing remote code, validates all 12 tables, and records URL, retrieval timestamp and SHA-256. Review against the live calculator before extending the validity dates. The per-plate API retrieves weight/fuel from the backend cache; it does not trust caller-supplied technical values.

Additional RDW datasets: `3huj-srit` (axes), `vezc-m2t6` (body), `jqs4-4kvw` (odometer explanation), `t49b-isb7` (recall status), `j9yg-7rg9` (campaign), `9ihi-jgpf` (risks), `byxc-wwua` (type approval base) and `7rjk-eycs` (transmission). Recall status O means open; P means the producer reported repair. Actions join by the actual plate/reference, not by general make/model similarity. Optional-source failures preserve core registration and carry warnings. Persisted schema-v1 cache records are refreshed automatically.

New sources are `jhie-znh9`, `kmfi-hrps`, `sgfe-77wx`, `a34c-vvps`, `hx2c-gt7k` and `mu2x-mu5e`. Possible model recalls stay separate and never change the plate indicator. Source schema version 3 refreshes persisted v1/v2 data; older browser records remain readable.

## Operational limits

The in-process limiter and request coalescing work per API worker. Use an edge limiter or shared Redis limiter before scaling to multiple workers. PostgreSQL is a shared cache, not a user database. Monitor `/health`, RDW availability and cache failures. Configure TLS and trusted proxy handling in the deployment environment. The manifest provides install metadata; no offline vehicle-data cache or service worker is installed.
