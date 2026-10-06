# RitVizier

A Dutch vehicle lookup application. Next.js renders the interface; FastAPI fetches and normalizes official RDW Open Data. Recent searches, favourites and comparison selections stay in the browser. No account or analytics is required.

## Project documentation and versions

Read [Contributing](CONTRIBUTING.md) for branches, commits, checks and releases. [Architecture](docs/architecture.md) maps code and data flow; [Developer handoff](docs/handoff.md) records current behavior and maintenance priorities. [Verification](docs/verification.md) records completed checks and limits. Coding agents should read [AGENTS.md](AGENTS.md) before editing.

`main` holds integrated work. New tasks use their own branch and merge commit. Annotated tags identify checked snapshots; `v1.0.0` is the first tagged baseline. See the [Changelog](CHANGELOG.md). Git history is currently local; no remote repository is configured.

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

The frontend proxies `/api/vehicles/:plate`, `/api/costs` and `/api/road-tax` to FastAPI. Domain logic belongs to the Python backend. RDW registration, fuel, body, axle, odometer explanation and recall datasets are combined. Type approval is joined on the complete approval number, variant and execution code; conflicting revisions or ranges never become arbitrary specifications. No owner, damage or maintenance history is inferred.

## Configuration

`BACKEND_URL` configures the server-only proxy. `NEXT_PUBLIC_SITE_URL` sets canonical URLs. `DATABASE_URL` enables PostgreSQL cache persistence. `CACHE_TTL_SECONDS` defaults to six hours. `CORS_ORIGINS` is a comma-separated allowlist. `RATE_LIMIT_PER_MINUTE` controls the per-process IP limiter. Root environment files are examples; place actual configuration in `backend/.env` and `frontend/.env.local`. No API key is needed for RDW.

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

End-to-end tests require a production build first. Playwright starts an isolated frontend on port 3100 and fixture API on port 8001. These test servers never replace the live RDW provider in the normal application. Fixture records are snapshots from RDW fetched on 6 October 2026. Screenshots are saved to ignored `artifacts/`. Run `scripts/smoke-test.ps1` with the normal API running to verify the live RDW path separately.

## PostgreSQL and containers

`docker compose up --build` starts PostgreSQL, FastAPI and Next.js. Backend migrations run before the API starts. For manual migration, run `alembic upgrade head` from `backend/` with `DATABASE_URL` configured. Production frontend: `npm run build` then `npm start`.

## Data and calculations

Missing RDW values remain null. Source metadata records datasets, retrieval time and missing fields. kW-to-hp, import indication, payload, age and APK countdown are labelled as derived. Both colors, registration date, WAM, odometer judgment, exact execution identifiers, transmission, recall status/detail/risk and separate WLTP/NEDC figures are shown. Exact odometer readings, complete inspection history and commercial option packages are unavailable through these public sources.

Running costs prefill RDW WLTP consumption (NEDC fallback). Insurance, maintenance, distance and energy price remain editable assumptions. Road tax uses official provincial passenger-car tables from the Belastingdienst calculator. The checked snapshot in `backend/app/data/road_tax_2026.json` is valid July–December 2026 and uses **massa rijklaar**, not empty mass. Petrol hybrids pay the normal rate; fully electric/hydrogen cars use 70% of the petrol quarterly amount, rounded down exactly as the live calculator does. Its legacy EV table column is deliberately unused. Diesel needs an explicit particulate-surcharge choice; LPG needs the registered installation class. Unsupported categories, missing weight, oldtimer cases and dates outside validity return an unavailable reason, never a guessed zero. The frontend labels the total as excluding road tax until it is known; manual override remains possible. Estimates exclude personal exemptions, suspension, depreciation, financing and purchase costs.

To refresh the reviewed snapshot, run `.venv\Scripts\python backend/scripts/update_road_tax.py`. It parses only numeric assignments from the official public asset without executing remote code, validates all 12 tables, and records URL, retrieval timestamp and SHA-256. Review against the live calculator before extending the validity dates. The per-plate API retrieves weight/fuel from the backend cache; it does not trust caller-supplied technical values.

Additional RDW datasets: `3huj-srit` (axes), `vezc-m2t6` (body), `jqs4-4kvw` (odometer explanation), `t49b-isb7` (recall status), `j9yg-7rg9` (campaign), `9ihi-jgpf` (risks), `byxc-wwua` (type approval base) and `7rjk-eycs` (transmission). Recall status O means open; P means the producer reported repair. Actions join by the actual plate/reference, not by general make/model similarity. Optional-source failures preserve core registration and carry warnings. Persisted schema-v1 cache records are refreshed automatically.

## Operational limits

The in-process limiter and request coalescing work per API worker. Use an edge limiter or shared Redis limiter before scaling to multiple workers. PostgreSQL is a shared cache, not a user database. Monitor `/health`, RDW availability and cache failures. Configure TLS and trusted proxy handling in the deployment environment. The manifest provides install metadata; no offline vehicle-data cache or service worker is installed.
