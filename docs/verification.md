# Verification

Verified locally on 7 October 2026 with Node 22.13.1 and Python 3.12.14.

## Automated checks

- Frontend: 17 validation/formatting unit tests.
- Backend: 24 normalization, provider, cache, cost, validation and rate-limit tests.
- Browser: 20 production-build tests across Chromium and WebKit iPhone profiles.
- ESLint, TypeScript, Ruff and strict mypy pass.
- Optimized Next.js production build passes.
- npm audit reports zero vulnerabilities across production and development dependencies.
- Alembic emits valid PostgreSQL migration SQL for the vehicle cache table and expiry index.
- A separate live smoke check verifies official RDW retrieval for GZS88X and the FastAPI cost endpoint.

Browser tests exercise input normalization, invalid input, clear, direct links, noindex on unsuccessful lookups, saving and reopening vehicles, recent history, a second lookup from a vehicle page, comparison, removal, duplicate protection, clipboard sharing, cost updates, missing consumption, error responses, persistent themes and all vehicle sections.

The viewport matrix covers 320, 375, 390, 430, 768, 1024 and 1440 pixels. Browser screenshots are in ignored `artifacts/`. These are browser-engine checks, not a physical-device Safari test.

## Local network regression

Reproduced a disabled license-plate field at `http://192.168.50.205:3000` caused by a rejected Next.js development connection. Development origins now include the machine's own IPv4 interface addresses. `scripts/check-lan.mjs` passes in Chromium and WebKit at 390px, checking that the field enables, a license plate can be entered, RDW results load, another lookup works from the vehicle page, and no browser errors occur.

## Visual review

Reviewed light and dark desktop screenshots, mobile home and vehicle screenshots, and responsive captures from both engines. No page-level horizontal overflow appeared in the tested routes and widths. The visual lint found no major homepage findings after corrections. Accepted minor findings are decorative plate-strip letters and text inside the small illustrative cost graphic; the functional content has separate readable labels.

## Operational boundaries

The Docker engine was unavailable during this session. Container builds and a live PostgreSQL round trip have not been run. SQL generation, ORM definitions and memory-cache behavior were checked. The app currently uses the bounded memory cache.

The rate limiter uses connection IPs per process. Behind the Next.js proxy, requests share the proxy's bucket. Use an edge limiter that knows client IPs, or a trusted identity/shared limiter, for a public deployment with multiple users or workers. This initial repository is runnable locally; it has not been deployed publicly.

Road tax is manual input. The scenario omits depreciation and financing. The manifest supplies install metadata; offline support is not implemented.
