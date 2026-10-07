# Verification

Verified locally on 7 October 2026 with Node 22.13.1 and Python 3.12.14.

## Automated checks

- Frontend: 24 validation, formatting, APK date-boundary/threshold, legacy-storage and source-link tests.
- Backend: 77 normalization, provider, source cache, APK joins, analysis, recall/type-approval joins, cost, road-tax, validation and rate-limit tests.
- Browser: 32 production-build tests across Chromium and WebKit iPhone profiles.
- ESLint, TypeScript, Ruff and strict mypy pass.
- Optimized Next.js production build passes.
- npm audit reports zero vulnerabilities across production and development dependencies.
- Alembic emits valid PostgreSQL migration SQL for the vehicle cache table and expiry index.
- A separate live smoke check verifies official RDW retrieval for GZS88X and the FastAPI cost endpoint.

Browser tests exercise input normalization, invalid input, clear, direct links, noindex on unsuccessful lookups, saving and reopening vehicles, recent history, a second lookup from a vehicle page, comparison, removal, duplicate protection, clipboard sharing, cost updates, missing consumption, error responses, persistent themes and all vehicle sections.

The viewport matrix covers 320, 375, 390, 430, 768, 1024 and 1440 pixels. Browser screenshots are in ignored `artifacts/`. These are browser-engine checks, not a physical-device Safari test.

## Version baseline and motion regression

The `v1.0.0` baseline includes the registration-year and motion changes. Browser checks verify that the last registration year is exactly `2026`, that tab content has an appearance transition under the normal motion preference, and that reduced motion disables it while the data remains accessible. The full suite contains 23 frontend, 46 backend and 26 browser checks, totaling 95 tests.

Desktop and mobile captures were reviewed after the changes. Vehicle-page visual lint reports the intentionally scrolling tab strip and small existing secondary/decorative labels. The cost prompt contrast findings were corrected. No page-level overflow or browser console errors appeared in these captures. Year screenshots are in `artifacts/registration-year-chromium.png` and `artifacts/registration-year-webkit-iphone.png`; additional captures are in `artifacts/motion-desktop/` and `artifacts/motion-mobile/`. These artifacts are ignored by Git and must be regenerated on another checkout.

Branch and release procedures are in `CONTRIBUTING.md`. Feature and documentation changes use separate branches and merge commits. The annotated baseline tag identifies the integrated snapshot. History and tags have since been pushed to GitHub; branch protection remains a separate owner setting.

## Local network regression

Reproduced a disabled license-plate field at `http://192.168.50.205:3000` caused by a rejected Next.js development connection. Development origins now include the machine's own IPv4 interface addresses. `scripts/check-lan.mjs` passes in Chromium and WebKit at 390px, checking that the field enables, a license plate can be entered, RDW results load, another lookup works from the vehicle page, and no browser errors occur.

## Visual review

Reviewed light and dark desktop screenshots, mobile home and vehicle screenshots, and responsive captures from both engines. No page-level horizontal overflow appeared in the tested routes and widths. The visual lint found no major homepage findings after corrections. Accepted minor findings are decorative plate-strip letters and text inside the small illustrative cost graphic; the functional content has separate readable labels.

## Operational boundaries

After a reported leak notification, Gitleaks 8.30.1 scanned all 18 commits reachable from the existing branches and tags on 7 October with complete value redaction. No leaks were found, and GitHub's open secret-scanning alert list was empty. The supplied alert link identified `docker-compose.yml` line 19 in commit `e178dd13a4719508c4f18af323a279151dcf45f1`: a connection string with an environment-variable substitution and fixed development fallback. The same development example appeared in Alembic configuration and the environment template. These fallback examples were removed from current code. Existing history and version tags were preserved; the notification can be classified as a development-example false positive provided that value was never used for a real deployment. CI now gates publishing/deployment on a full-history redacted Gitleaks scan too.

During the original application build the Docker engine was unavailable. The later deployment work on 7 October exercised Docker Desktop's Linux engine: both production images built, PostgreSQL 17 and API/frontend containers became healthy, Alembic created the cache table, a real cache write/read/delete passed, and a request through the container frontend proxy returned the expected validation response. The isolated smoke stack and its test volume were removed afterward. The normal development app still uses memory caching.

Deployment verification uses `scripts/test-deployment.py` for healthy release selection, failed-update rollback, failed-first-deploy state and missing configuration. These tests use a fake Docker executable; they do not claim actual SSH/VPS recovery. The workflow also passes actionlint and the shell scripts pass Bash syntax checks. All 133 application tests, lint/type checks and the optimized build were rerun for the deployment change. Actual VPS authentication, host reverse proxy/TLS and public deployment are pending the owner's configuration.

The host Nginx example for `ritvizier.nl` and the redirected `ritvizier.twanterstappen.nl` passes `nginx -t` inside the official stable Alpine image with an ignored one-day test certificate. CI repeats this syntax check. This is not a real certificate or a verification of the existing Ubuntu host's Nginx configuration.

## Extended check verification

The extended implementation adds source schema 3, APK notifications/defects/reference descriptions, multi-record fuel/body/class data, expanded axles, separate possible model recalls, pure analysis and per-source caching. The complete current suite totals 133 tests: 24 frontend, 77 backend and 32 browser checks. See [implementation details](extended-rdw-check.md) for changed files, contracts and limitations.

Live source retrieval confirmed two MINI notifications, dated 15 October 2025 and 13 October 2023. The 2023 observations include one wheel-bearing defect and two brake-hose defects, with official descriptions valid at that date. The 2025 notification has no matched defect rows; the interface does not interpret that as a complete clean history. Model campaign context remains separate from the false plate-specific pending indicator.

New tests cover date/time fallback, conflicting duplicates, description validity, observation-only events, partial sources, explicit unknown indicators, multi-fuel/body/axle/class data, warning boundaries/codes, cached-reference coalescing, empty/nonempty optional tokens, source-expiry bounds and distinct upstream failures. Browser tests exercise readable history, disclosure open/close, small-phone history at 320px, technical axles, manual mileage, possible campaigns and partial multi-fuel responses.

Desktop and mobile captures are in ignored `artifacts/extended-rdw-desktop/`, `artifacts/extended-rdw-mobile/` and `artifacts/apk-history-*.png`. No page-level overflow, failed requests or browser errors occurred in the reviewed captures. Accepted lint findings are the intentionally scrolling tab strip and existing decorative/secondary small labels. Status-card helper text was increased to 12px.

WebKit element screenshots can include fixed navigation or skip-link paint artifacts. The accordion flow separately confirmed the skip link was unfocused and outside the viewport in both engines; a regression assertion checks that it does not obscure the live view. Full viewport captures were reviewed separately.

A fresh provider lookup took about 1.075 seconds, a warm provider call about 1 millisecond, and a warm live API call about 1.5 milliseconds. These single-machine observations satisfy the cached-response target in this scenario and are not a production performance guarantee. Standard frontend checks, optimized build, Ruff and strict mypy pass. Backend tests emit a dependency deprecation warning about the Starlette/httpx test client; tests still pass.

The local site is served by a dedicated backend on loopback port 8002. Its code reloads during development. The pre-existing port-8000 process was left intact after its termination was rejected by automatic review. The frontend's ignored environment directs proxy requests to 8002; fresh installations use the README setup. No runtime configuration or logs are checked in.

The rate limiter uses connection IPs per process. Behind the Next.js proxy, requests share the proxy's bucket. Use an edge limiter that knows client IPs, or a trusted identity/shared limiter, for a public deployment with multiple users or workers. This initial repository is runnable locally; it has not been deployed publicly.

Road tax uses a reviewed snapshot of the official Belastingdienst passenger-car calculator, valid July–December 2026. The live calculator and the API agree on €226 per quarter for G921GS, petrol, 1,490 kg massa rijklaar, Noord-Holland. All 12 province rows and weight boundaries have unit coverage. EV/H2 uses the current calculator's 70%-then-floor rule; its unused legacy EV column differs by €1 in some bands and is deliberately ignored. Diesel requires confirmation of particulate surcharge, LPG of installation class. Special categories and dates beyond the reviewed validity period return unavailable. The scenario omits depreciation and financing. The manifest supplies install metadata; offline support is not implemented.

## Expanded RDW information

Compared G921GS with the public RDW Kentekencheck and retrieved the actual public registration, fuel, axle, body, odometer explanation and exact type-approval rows. Confirmed Groen/Zwart, FMX/YW31/DAW500L0, automaat/7 versnellingen, logically increasing odometer judgment with last-registration year 2026, no pending recall indicator and no linked public campaigns, separate CO₂ 157 WLTP/122 NEDC, consumption 6.9 WLTP/5.4 NEDC, and exact approval dimensions 4299 × 1822 × 1557 mm. Public readings and complete inspection dates are not fabricated.

Raw MINI snapshots are in `backend/tests/fixtures/rdw-mini.json`; the normalized snapshot joins the existing browser fixtures. Synthetic open/repaired recalls exist only inside test functions, never in the normal provider. Browser checks exercise both campaigns and unavailable data, the added tabs at mobile width, automatic road tax entering the cost estimate, province changes, clearing the province and manual override. Actual LAN checks still pass in both engines. The live LAN page was also reviewed in the in-app browser, including successful automatic MRB and monthly-cost updates.
