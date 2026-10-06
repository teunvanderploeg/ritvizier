# Verification

Verified locally on 7 October 2026 with Node 22.13.1 and Python 3.12.14.

## Automated checks

- Frontend: 23 validation, formatting, APK date-boundary, legacy-storage and source-link tests.
- Backend: 46 normalization, provider, cache, recall joins, exact approval joins, cost, provincial road-tax, validation and rate-limit tests.
- Browser: 24 production-build tests across Chromium and WebKit iPhone profiles.
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

Road tax uses a reviewed snapshot of the official Belastingdienst passenger-car calculator, valid July–December 2026. The live calculator and the API agree on €226 per quarter for G921GS, petrol, 1,490 kg massa rijklaar, Noord-Holland. All 12 province rows and weight boundaries have unit coverage. EV/H2 uses the current calculator's 70%-then-floor rule; its unused legacy EV column differs by €1 in some bands and is deliberately ignored. Diesel requires confirmation of particulate surcharge, LPG of installation class. Special categories and dates beyond the reviewed validity period return unavailable. The scenario omits depreciation and financing. The manifest supplies install metadata; offline support is not implemented.

## Expanded RDW information

Compared G921GS with the public RDW Kentekencheck and retrieved the actual public registration, fuel, axle, body, odometer explanation and exact type-approval rows. Confirmed Groen/Zwart, FMX/YW31/DAW500L0, automaat/7 versnellingen, logically increasing odometer judgment with last-registration year 2026, no pending recall indicator and no linked public campaigns, separate CO₂ 157 WLTP/122 NEDC, consumption 6.9 WLTP/5.4 NEDC, and exact approval dimensions 4299 × 1822 × 1557 mm. Public readings and complete inspection dates are not fabricated.

Raw MINI snapshots are in `backend/tests/fixtures/rdw-mini.json`; the normalized snapshot joins the existing browser fixtures. Synthetic open/repaired recalls exist only inside test functions, never in the normal provider. Browser checks exercise both campaigns and unavailable data, the added tabs at mobile width, automatic road tax entering the cost estimate, province changes, clearing the province and manual override. Actual LAN checks still pass in both engines. The live LAN page was also reviewed in the in-app browser, including successful automatic MRB and monthly-cost updates.
