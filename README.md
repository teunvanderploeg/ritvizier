# RitVizier

[![Quality checks and deployment](https://github.com/twanterstappen/ritvizier/actions/workflows/ci.yml/badge.svg)](https://github.com/twanterstappen/ritvizier/actions/workflows/ci.yml)
[![Website status](https://img.shields.io/website?url=https%3A%2F%2Fritvizier.nl%2F&up_message=live)](https://ritvizier.nl/)
[![Version](https://img.shields.io/github/v/tag/twanterstappen/ritvizier?style=flat)](https://github.com/twanterstappen/ritvizier/tags)
[![Next.js version](https://img.shields.io/badge/Next.js-16.4.0-blue?style=flat&logo=nextdotjs&logoColor=white)](#how-it-works)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react&logoColor=white)](#how-it-works)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat&logo=typescript&logoColor=white)](#how-it-works)
[![Python requirement](https://img.shields.io/badge/Python-3.12%2B-blue?style=flat&logo=python&logoColor=white)](docs/install.md#requirements)
[![FastAPI](https://img.shields.io/badge/FastAPI-blue?style=flat&logo=fastapi&logoColor=white)](docs/architecture.md#api-contracts)

Look up a Dutch license plate to explore official RDW vehicle information, APK history, recalls and estimated running costs. Save favourites and compare up to three vehicles. Recent searches, saved vehicles and comparison selections stay in your browser, with no account required and no analytics.

[Visit RitVizier](https://ritvizier.nl/) · [Local setup](#local-setup) · [Documentation](#documentation) · [Changelog](CHANGELOG.md)

## What you can do

- Check registration, both registered colors, engine details, dimensions, transmission and separate WLTP/NEDC consumption and emissions.
- Read available APK notifications and historical defect observations with official descriptions and source dates.
- Inspect plate-specific recalls and producer-reported repair status. Possible model campaigns appear separately.
- Estimate monthly and yearly running costs with editable assumptions and provincial road tax for supported passenger cars.
- Reopen recent searches, save favourites, share vehicle links and compare vehicles side by side.
- Use a responsive Dutch interface with light/dark themes, keyboard access and reduced-motion support.
- Search imported Dutch vehicle listings on `/aanbod` or in the comparable-offer tab. Duplicate adverts retain their individual source links and prices.

Listing search needs a current authorized CSV/JSON export. No listing feed, paid API or nationwide market coverage is connected by default. See [listing import and search](docs/listing-search.md).

## How it works

The Next.js frontend calls server-side proxy routes. FastAPI retrieves and normalizes real RDW Open Data, joins related records and calculates costs. No RDW API key is required.

| Layer           | Stack and responsibility                                                      |
| --------------- | ----------------------------------------------------------------------------- |
| Frontend        | Next.js App Router, React, TypeScript, Zod, Lucide and custom CSS             |
| Backend         | FastAPI, Pydantic and httpx for RDW retrieval, validation and calculations    |
| Cache           | Bounded in-memory storage, with optional PostgreSQL persistence               |
| Browser storage | Recent searches, favourites, comparison selections and theme                  |
| Delivery        | Docker Compose and GitHub Actions checks, image publishing and VPS deployment |

The frontend proxies `/api/vehicles/:plate`, `/api/costs`, `/api/road-tax` and `/api/listings` to FastAPI. Python owns retrieval and calculation rules. PostgreSQL stores shared cached responses; personal vehicle collections remain in browser storage and do not sync between devices. The [architecture guide](docs/architecture.md) explains API contracts, source joins and cache behavior.

## Local setup

Follow [Installation](docs/install.md) for Windows, macOS/Linux, optional PostgreSQL, Docker and first-run checks. The short Windows setup is below.

Install Node.js 22.12+, Python 3.12+ and npm. PostgreSQL 16+ is optional. Run these PowerShell commands from the repository root:

```powershell
npm ci
python -m venv .venv
.venv\Scripts\python -m pip install -e "backend[dev]"
if (-not (Test-Path backend/.env)) { Copy-Item .env.example backend/.env }
if (-not (Test-Path frontend/.env.local)) { Copy-Item .env.example frontend/.env.local }
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Keep the backend running. In a second terminal, start the frontend:

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000). The backend's interactive API documentation is at [127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### Test on your local network

For a phone or another device on the same network, use the computer's IPv4 address on port 3000, for example `http://192.168.50.205:3000`. The development server listens on all interfaces and allows its local interface addresses for Next.js development assets and live updates. Restart it after a network-address change. With the development server running, `node scripts/check-lan.mjs http://192.168.50.205:3000` checks network access, input and lookups in Chromium and WebKit.

Replace the example address with your computer's address. The phone only needs access to frontend port 3000.

## Configuration

See [Configuration](docs/configuration.md) for environment-file precedence, container settings and optional listing imports.

Use `backend/.env` and `frontend/.env.local` for local configuration. The root [.env.example](.env.example) is a template. Keep actual environment files out of Git.

| Variable                              | Purpose and default                                                     |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `BACKEND_URL`                         | Server-only proxy destination, `http://127.0.0.1:8000` locally          |
| `NEXT_PUBLIC_SITE_URL`                | Canonical site URL, `http://localhost:3000` locally                     |
| `DATABASE_URL`                        | Optional PostgreSQL connection string; empty uses memory caching        |
| `CACHE_TTL_SECONDS`                   | Aggregate cache lifetime, `21600` seconds, capped by source expiry      |
| `CORS_ORIGINS`                        | Comma-separated allowlist, `http://localhost:3000` locally              |
| `RATE_LIMIT_PER_MINUTE`               | Per-process IP limit, `30`                                              |
| `RDW_APP_TOKEN`                       | Optional server-only SODA token; empty tokens are omitted               |
| `RDW_TIMEOUT_SECONDS`                 | Per-query timeout, `8` seconds; the total budget includes slot waiting  |
| `APK_NOTICE_DAYS` / `APK_URGENT_DAYS` | APK warning thresholds, `60` / `30` days                                |
| `RECENT_REGISTRATION_DAYS`            | Recent-registration threshold, `30` days                                |
| `LISTINGS_FILE`                       | Server-only path to a current listing snapshot; empty means unavailable |

Source-specific cache lifetimes are fixed in the allowlisted RDW client registry. The aggregate cannot outlive a source's expiry.

## Checks

Run the checks relevant to your change, as described in [Contributing](CONTRIBUTING.md#checks-by-change). The full application checks are:

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

## Containers and deployment

For automatic production deployment after all GitHub checks pass, follow [VPS deployment](docs/deployment.md). It documents the SSH secrets, repository variables, one-time VPS setup, HTTPS proxy, persistent database and rollback behavior. Production uses `deploy/compose.yml`; the root Compose file below remains the local development stack.

The Oracle rollout was verified on 8 October 2026. See [the recorded evidence](docs/verification.md#oracle-production-rollout-8-october-2026) for what was checked and the remaining operational limits.

For local Docker, copy `.env.example` to an ignored root `.env` and set `POSTGRES_PASSWORD` to a random hex value, for example generated with `openssl rand -hex 32`. Then `docker compose up --build` starts PostgreSQL, FastAPI and Next.js. There is no built-in database password. Backend migrations run before the API starts. For manual migration, run `alembic upgrade head` from `backend/` with `DATABASE_URL` configured. Production frontend: `npm run build` then `npm start`.

## Data and calculation limits

Missing values remain null. Source metadata records section status, retrieval dates, datasets and unavailable fields. kW-to-hp, import, age and countdown are derived; official payload takes precedence over a labeled calculation. Both colors, registration/WAM, odometer judgment, execution/transmission, recalls and separate WLTP/NEDC figures appear. APK notifications and defects have a chronological timeline with official descriptions; absent records are not proof of a clean inspection or no damage. Exact mileage, complete inspection/maintenance history, owner counts, market values and all commercial packages remain unavailable.

### Running costs and road tax

Running costs prefill RDW WLTP consumption with a NEDC fallback. Insurance, maintenance, distance and energy price remain editable assumptions. Estimates exclude depreciation, financing and purchase costs.

Road tax uses official provincial passenger-car tables from the Belastingdienst calculator. The checked [2026 snapshot](backend/app/data/road_tax_2026.json) is valid July to December 2026 and uses **massa rijklaar**. Petrol hybrids pay the normal rate. Fully electric/hydrogen cars use 70% of the petrol quarterly amount, rounded down as in the live calculator. Its legacy EV table column is deliberately unused.

Diesel needs an explicit particulate-surcharge choice; LPG needs the registered installation class. Unsupported categories, missing weight, oldtimer cases and dates outside validity return an unavailable reason. The frontend labels the subtotal as excluding road tax until it is known or manually supplied. Personal exemptions and suspension are outside the calculation.

To refresh the reviewed snapshot, run `.venv\Scripts\python backend/scripts/update_road_tax.py`. It parses only numeric assignments from the official public asset without executing remote code, validates all 12 tables, and records URL, retrieval timestamp and SHA-256. Review against the live calculator before extending the validity dates. The per-plate API retrieves weight/fuel from the backend cache; it does not trust caller-supplied technical values.

### Source matching and compatibility

Type approvals match the complete approval number, variant and execution code. Conflicting records and ranges do not become guessed specifications. Recall status O means open; P means the producer reported repair. RitVizier does not independently verify repairs. Actions join by the actual plate/reference. Possible model campaigns stay separate and never change the plate-specific warning.

Optional-source failures preserve core registration with warnings. Source schema version 3 refreshes persisted v1/v2 data; older browser records remain readable. See the [extended RDW guide](docs/extended-rdw-check.md) for the complete source register, APK joins, analysis and provenance rules.

## Operational limits

The in-process limiter and request coalescing work per API worker. Use an edge limiter or shared Redis limiter before scaling to multiple workers. PostgreSQL is a shared cache, not a user database. Monitor `/health`, RDW availability and cache failures. Configure TLS and trusted proxy handling in the deployment environment. The manifest provides install metadata; no offline vehicle-data cache or service worker is installed.

Requests behind the Next.js proxy share its IP bucket. Process health alone does not establish RDW or database availability.

## Documentation

Start with installation for a new checkout, or troubleshooting for an existing setup.

| Guide                                            | What it covers                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [Installation](docs/install.md)                  | First-run setup, Windows/POSIX commands, PostgreSQL and local Docker   |
| [Configuration](docs/configuration.md)           | Environment variables, precedence, proxy, cache and container settings |
| [Troubleshooting](docs/troubleshooting.md)       | Startup, lookup, LAN, listings, road-tax and browser-test issues       |
| [Contributing](CONTRIBUTING.md)                  | Branches, commits, required checks and releases                        |
| [Architecture](docs/architecture.md)             | Code map, API contracts, source joins and storage                      |
| [Developer handoff](docs/handoff.md)             | Current behavior, maintenance priorities and troubleshooting           |
| [Verification](docs/verification.md)             | Dated evidence and untested scenarios                                  |
| [Extended RDW check](docs/extended-rdw-check.md) | Source register, APK history, analysis and cache implementation        |
| [Listing search](docs/listing-search.md)         | CSV/JSON imports, duplicate grouping and freshness                     |
| [VPS deployment](docs/deployment.md)             | Production setup, topology and operations                              |
| [Changelog](CHANGELOG.md)                        | Released and unreleased changes                                        |
| [Agent instructions](AGENTS.md)                  | Repository rules for coding agents                                     |

`main` holds integrated work. New tasks use their own branch and merge commit. Annotated tags identify checked snapshots; `v1.0.0` is the first tagged baseline. History, branches and release tags are backed up on [GitHub](https://github.com/twanterstappen/ritvizier). Coding agents should read [AGENTS.md](AGENTS.md) before editing.
