# RitVizier

A Dutch vehicle lookup application. Next.js renders the interface; FastAPI fetches and normalizes official RDW Open Data. Recent searches, favourites and comparison selections stay in the browser. No account or analytics is required.

## Development

Requirements: Node.js 22.12+, Python 3.12+, npm. PostgreSQL 16+ is optional for durable cache storage. Without a database, the backend uses a bounded in-memory cache.

```powershell
npm install
python -m venv .venv
.venv\Scripts\python -m pip install -e "backend[dev]"
Copy-Item .env.example backend/.env
Copy-Item .env.example frontend/.env.local
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

In another terminal, run `npm run dev` and open http://localhost:3000.

The frontend proxies `/api/vehicles/:plate` and `/api/costs` to FastAPI. Domain logic belongs to the Python backend. RDW datasets `m9d7-ebf2` and `8ys7-d773` supply registration and fuel data. No owner, damage or maintenance history is inferred.

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

Missing RDW values remain null. Source metadata records datasets, retrieval time and missing fields. kW-to-hp, import indication and payload are labelled as derived. Running costs are a scenario based on user-entered annual distance, consumption, energy price, insurance, maintenance and road tax. They exclude depreciation, financing and purchase costs. Road tax is entered by the user; this release does not implement an official tax calculator.

## Operational limits

The in-process limiter and request coalescing work per API worker. Use an edge limiter or shared Redis limiter before scaling to multiple workers. PostgreSQL is a shared cache, not a user database. Monitor `/health`, RDW availability and cache failures. Configure TLS and trusted proxy handling in the deployment environment. The manifest provides install metadata; no offline vehicle-data cache or service worker is installed.
