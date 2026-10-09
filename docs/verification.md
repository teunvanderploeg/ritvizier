# Verification

Entries record the state at the time of each check. Newer dated evidence can supersede older deployment or platform limitations; historical entries remain intact. For current setup instructions, use [Installation](install.md), [Configuration](configuration.md) and [Troubleshooting](troubleshooting.md).

## Dutch-road homepage hero, 9 October 2026

The homepage uses a decorative Dutch-road car photograph with a horizontal fade behind the desktop search form. On phones, the image follows the form with a vertical fade. Dark mode dims the photograph and uses a matching dark fade. The image does not represent any searched vehicle.

Generated with the built-in image generation tool and saved as `frontend/public/images/hero-dutch-road.webp` (1774 × 887, about 184 KiB). The original studio image remains available. Final prompt:

```text
Use case: photorealistic-natural. Asset type: wide website homepage hero background for RitVizier, a Dutch license plate lookup app. Create an editorial automotive photograph of a contemporary understated pale steel-blue compact hatchback with a plain yellow Dutch-style license plate, no lettering or brand logos, parked on the RIGHT THIRD of a quiet asphalt road beside a Dutch dike, grass verges, distant rows of willow trees, flat countryside and an open pale blue sky. Front three-quarter view, car facing towards left, complete car and wheels visible, realistic proportions. Wide landscape composition around 2:1. The car occupies the rightmost 40 percent; LEFT HALF has calm low-detail landscape and pale sky with ample negative space for a website search form which will be overlaid separately. Soft morning daylight, slight distant haze, natural muted greens, pale cool blues, welcoming trustworthy atmosphere. Real photographic texture, no dramatic sunset, no people, no text, no watermark, no UI, no luxury styling, no oversized car, no motion blur.
```

ESLint, TypeScript, all 24 frontend unit tests and the optimized production build pass. Six existing browser checks pass across Chromium and WebKit: plate validation/clearing, theme persistence and the 320–1440px viewport matrix. Reviewed desktop light/dark and 320px phone screenshots in ignored `artifacts/home-*-*.png` and `artifacts/dark-*.png`; the viewport checks found no page-level horizontal overflow. WebKit used the existing local library setup and `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`. The collaborative preview could not reach the local development server. No public deployment or physical-device Safari testing was performed.

## Brand refinement, 9 October 2026

The homepage now pairs the license-plate search with a studio-car image in a split layout. The search precedes the image on phones. Copy remains short and eyebrow headings remain absent. Light and dark themes use separate hero colors.

The new SVG mark combines an R, lane markings and a circular lens opening. Its geometry lives in `frontend/src/components/brand/mark.json`. Logo exports use outlines from the bundled Inter typeface. Light, dark and monochrome logos, favicon, app icons and social preview artwork were refreshed together.

The decorative hero image was generated with the built-in image generation tool, then compressed to the project asset `frontend/public/images/hero-car.webp` (about 64 KiB). It does not represent any searched vehicle. The final generation prompt was:

```text
Use case: product-mockup. Asset type: editorial automotive photograph for a Dutch vehicle lookup website, placed on the right half of a clean split hero. Make a premium but understated real studio photograph of a metallic ice-blue, contemporary compact five-door European hatchback, viewed front-left three-quarter at wheel height, facing left. Show the entire car with breathing room on all sides. The car sits on a pale cool blue seamless studio floor and backdrop, approximately #e9f1fa. A strong diagonal patch of natural window sunlight falls across the backdrop and floor, giving a beautiful architectural shadow; softly lit realistic bodywork and crisp glass, tyres and wheel details. Long lens, realistic proportions, carefully composed contemporary automotive editorial photography, not a cartoon, not an obvious glossy CGI render. Landscape 3:2 composition with car occupying middle/lower two thirds, empty space above. No people, buildings, scenery, typography, readable letters, brand badges, watermarks, logos or invented specs. Any license plate is a plain unlettered yellow rectangle. This is generic decorative imagery, not a photograph of a particular searched vehicle.
```

Validation after the refinement: ESLint, TypeScript, all 24 frontend unit tests, the production build and all 38 Chromium/WebKit browser scenarios pass. Reviewed light/dark desktop, mobile and WebKit 320px screenshots in `artifacts/redesign/round-two-*`, plus the logo and share-image exports. No page-level overflow or JavaScript errors appeared in the reviewed pages. The WebKit run used the same local library setup described below. Curated PR previews are stored in `docs/images/frontend-redesign/`; generated browser-test artifacts remain ignored.

## Interface simplification, 9 October 2026

Set up a fresh Linux checkout with Node 24.21.0, Python 3.14.4, npm workspace dependencies and a repository Python virtual environment. The local frontend runs on port 3000 and the real RDW backend on port 8000, using memory caching. A lookup through the frontend proxy returned MINI COUNTRYMAN COOPER for G921GS from RDW Open Data.

The homepage now centers on license-plate search with short feature summaries and compact tool links. Decorative vehicle previews, eyebrow headings, repeated header actions and footer slogans were removed. Page titles and empty states use direct labels; vehicle details retain their data, sources and workflows.

- ESLint, TypeScript, all 24 frontend unit tests and the production build pass.
- All 38 existing browser scenarios pass: 19 Chromium and 19 WebKit iPhone checks, including lookup, saved/recent vehicles, comparison, costs, themes, reduced motion and the 320–1440px viewport matrix.
- Reviewed desktop, mobile and dark-mode homepage screenshots, live vehicle screenshots, and WebKit desktop/320px captures in ignored `artifacts/redesign/`. The reviewed pages had no page-level overflow or JavaScript errors.
- WebKit initially could not launch because shared libraries were missing. Ubuntu packages were extracted locally into ignored `artifacts/browser-deps/` and linked into the downloaded browser bundle. The successful run used `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` because the system library cache cannot see these local libraries. No system packages were installed. Browser tests ran against the normal production-build fixture setup; the separate live lookup used the real provider.
- The collaborative preview reported that its browser host was unavailable, so screenshots and browser verification used local headless engines. No public deployment, physical-device Safari, Docker or PostgreSQL verification was performed for this change.

## Oracle production rollout, 8 October 2026

[Main workflow 37784839170](https://github.com/twanterstappen/ritvizier/actions/runs/37784839170) passed frontend, backend, both browser engines, the history secret scan, container/real PostgreSQL smoke verification, image publishing and SSH deployment. The VPS `current-release` matched `6492d2ab1293dd6ebfc15886fb3f4f823b0736a2`.

Direct SSH inspection confirmed `ritvizier-frontend-1`, `ritvizier-backend-1` and `ritvizier-db-1` healthy on `ritvizier_default`, with no portfolio containers on that network. Only the frontend publishes `0.0.0.0:3000`; backend/database ports are not published. The existing `nginx_proxy` and `flask_app` remained running, and the portfolio origin returned 200 after restoring its original proxy topology.

Chromium verified HTTPS 200 responses and expected page headings for `https://ritvizier.nl/` and `/aanbod` through the separate proxy at `144.21.43.210`. A real G921GS lookup through the production frontend proxy returned MINI COUNTRYMAN COOPER, and PostgreSQL `vehicle_cache` contained one record afterward. This verifies an actual production cache write, not only CI's isolated database. The owner confirmed the remote-proxy upstream and Oracle TCP 3000 ingress rule.

The server environment is mode 600, and a 2 GB swap file supports the 1 GB VPS. No private key or database password was printed or committed. GitHub secret names were inspected, then the successful SSH deploy exercised their values. No paid listing source or feed was connected. This rollout did not exercise a real failed-release rollback, database restore, certificate renewal or physical-device Safari.

## Listing search, 8 October 2026

The subsequent Linux GitHub Actions run [37782987330](https://github.com/twanterstappen/ritvizier/actions/runs/37782987330) passed all 38 browser scenarios, including WebKit, plus frontend/backend checks, production container builds and actual PostgreSQL/proxy smoke checks. An initial WebKit run found an ambiguous test selector that also matched Next.js's route announcer; the assertion now selects the search panel's own alert. This CI evidence supplements the local Windows limitations below.

- Backend: 92 tests pass, including 15 new listing/import checks covering cross-site grouping, conflicting identifiers, incomplete-record bridging, source price retention, numeric filters, pagination, stale snapshots, unsafe links, duplicate observations and atomic import preservation on failure.
- Frontend: all 24 existing unit tests pass; ESLint, route/type generation, TypeScript and production build pass. Ruff and strict mypy pass.
- Chromium: all 19 browser scenarios pass. The three new listing scenarios were rerun after the final card/wording changes and pass. They exercise editable filters, one car with two source links/prices, vehicle-prefilled filters, unavailable/empty results, malformed response rejection and retry.
- Desktop 1440px and small-phone 320px captures were inspected in `artifacts/listings/`. No page-level overflow occurred. The skip link was asserted offscreen, then hidden only during screenshot capture to avoid its known full-page screenshot paint artifact. Product focus styles are unchanged.
- WebKit was installed and attempted, but all 19 scenarios fail before browser startup because the host cannot load `icuin77.dll`, `libxml2.dll` and `webcore.dll`. No WebKit or physical-device Safari verification is claimed for this change. The Docker engine was unavailable as an alternative browser environment.
- Listing tests use temporary synthetic feeds and intercepted browser responses only. No actual dealer/marketplace feed was supplied, no paid JP.cars API was used, and no live-market coverage, scheduled import, production snapshot mount or public deployment was verified. Production without `LISTINGS_FILE` reports unavailable rather than displaying test adverts.
- Local test setup used the bundled Node/Python runtimes, a project virtual environment and ignored npm tooling. Windows blocked the SQLAlchemy wheel extension, so a pure Python SQLAlchemy distribution was installed locally to run checks; project dependency declarations were not changed. The existing Starlette/httpx deprecation warning remains.

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
