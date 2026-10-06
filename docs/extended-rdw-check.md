# Extended vehicle check implementation

Implemented from the user's [specification](specifications/extended-rdw-check.md) on 7 October 2026. This document records the resulting behavior, source joins, deliberate limits and validation. The existing flat vehicle contract and proxy routes remain in use.

## What changed

One vehicle lookup now includes registration, all fuel/body records, body specifications, vehicle classes, expanded axles, APK notifications/observations, date-valid defect descriptions, exact plate recalls, possible model campaigns, odometer explanations and exact type approvals. Not every source has records for every vehicle. For example, additional vehicle classes mainly describe buses.

New sections are `APK-historie` and `Carrosserie & assen`. Fuel registrations appear separately in `Motor & prestaties`, without adding combustion/electric motor powers into an assumed system output. Optional technical blocks are hidden when no records exist. Missing APK data gets one explanation, rather than a fabricated clean-history result.

The odometer section accepts an optional user-entered reading for a labeled annual average. It is not sent as an official reading, saved in the vehicle record or used to invent historical mileage. Catalogue price and BPM remain original registration values; no current market value is shown.

## Files and ownership

| Files                                                                                                                                                                                            | Change                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/providers/rdw_client.py`                                                                                                                                                            | Fixed dataset/filter registry, bounded requests, per-source TTLs, request coalescing, token handling and classified failures |
| `backend/app/providers/rdw.py`                                                                                                                                                                   | Aggregate retrieval and normalization, body/class/fuel arrays, expanded axles, APK enrichment and separate possible recalls  |
| `backend/app/core/rdw_values.py`, `backend/app/core/config.py`                                                                                                                                   | Defensive dates/numbers/indicators and configurable token/timeouts/warning thresholds                                        |
| `backend/app/schemas/vehicle.py`                                                                                                                                                                 | Backwards-compatible additions and source schema version 3                                                                   |
| `backend/app/services/apk_history.py`                                                                                                                                                            | Date/time/recognition joins and official description validity                                                                |
| `backend/app/services/analysis.py`                                                                                                                                                               | Pure date/status/history analysis and structured warnings                                                                    |
| `backend/app/services/vehicles.py`                                                                                                                                                               | Daily analysis refresh on cached responses and aggregate expiry bounded by source deadlines                                  |
| `backend/app/services/valuation.py`                                                                                                                                                              | Future market-provider input/result/protocol, with no fabricated valuation implementation or endpoint                        |
| `backend/app/main.py`, `.env.example`                                                                                                                                                            | Machine-readable API error codes and server-only configuration                                                               |
| `backend/tests/test_extended_rdw.py`, `backend/tests/test_domain.py`                                                                                                                             | Data, join, cache, token, partial-failure and analysis regression coverage                                                   |
| `backend/tests/fixtures/rdw-mini.json`, `backend/tests/fixtures/vehicles.json`                                                                                                                   | Actual MINI source snapshots and normalized browser data                                                                     |
| `frontend/src/types/vehicle.ts`                                                                                                                                                                  | Zod additions with defaults for older browser collections                                                                    |
| `frontend/src/features/vehicle-details/ApkHistory.tsx`                                                                                                                                           | Chronological notifications and readable defect observations                                                                 |
| `frontend/src/features/vehicle-details/TechnicalDetails.tsx`, `FuelRecords.tsx`                                                                                                                  | Multiple technical records and optional fields                                                                               |
| `frontend/src/features/vehicle-details/PossibleRecalls.tsx`, `MileageEstimate.tsx`                                                                                                               | Clearly separated model context and user-entered mileage calculation                                                         |
| `frontend/src/features/vehicle-details/VehicleDetail.tsx`, `timeline.ts`                                                                                                                         | New tabs/status card, structured attention messages, last APK report, source freshness and thresholds                        |
| `frontend/src/app/globals.css`                                                                                                                                                                   | Responsive cards, disclosures, timeline, readable labels and motion                                                          |
| `frontend/e2e/extended-rdw.spec.ts`, `product.spec.ts`, `timeline.test.ts`                                                                                                                       | Real-data UI checks, partial/fuel scenarios, disclosure behavior and legacy defaults                                         |
| `frontend/src/app/layout.tsx`, `page.tsx`, `over/page.tsx`, `components/layout/Footer.tsx`, `components/vehicle/VehiclePreview.tsx`, `features/ownership-costs/CostEstimator.tsx`, `RoadTax.tsx` | Neutral public source wording and updated source/cost explanations                                                           |

Paths in abbreviated frontend rows are relative to `frontend/src/`; tests follow their existing directories.

## Aggregate API

No new public endpoint is needed. `GET /api/vehicles/{plate}` carries the additions. The browser still calls its own Next.js API, and the backend makes all SODA requests. `GET /health`, `POST /api/costs` and `POST /api/road-tax` remain available.

Additions include `fuels`, `bodies`, `bodySpecifications`, `vehicleClasses`, expanded `axes`, `apkHistory`, `analysis`, `waitingForInspection`, `payloadDerived`, `originalDimensions`, `possibleRecalls` and `possibleRecallsAvailable`.

`source.partial`, `source.unavailableSections` and `source.sections` distinguish failed/incomplete sections from successful empty results. Each section records dataset IDs, actual source retrieval time, availability, truncation and raw record count. The top-level source timestamp describes aggregate assembly; the interface also exposes retrieval dates per section. Persisted schema-v1/v2 responses refresh automatically. Older saved browser records remain readable through Zod defaults.

| Condition                            | HTTP status and code                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Invalid plate                        | `422 invalid_plate`, preserving the existing strict plate-validator contract |
| No main vehicle record               | `404 vehicle_not_found`; no optional requests follow                         |
| Upstream rate limit                  | `429 upstream_rate_limited`, `Retry-After: 60`                               |
| Unavailable/malformed primary source | `502 rdw_unavailable`                                                        |
| Primary timeout                      | `504 rdw_timeout`                                                            |
| Secondary failure                    | `200`, with section status and warning                                       |

Errors preserve the human-readable `detail` field. Pydantic body-validation errors retain FastAPI's existing validation response. The API is not a generic proxy and does not accept caller-supplied SODA clauses or source URLs.

## Source registry

All resource URLs use `https://opendata.rdw.nl/resource/{id}.json`. IDs and allowed filter names are fixed in `rdw_client.py`; response-provided API links are not followed. These IDs and field definitions were checked against the [official metadata API](https://opendata.rdw.nl/api/views/sgfe-77wx.json).

| Dataset ID  | Section                       | TTL      |
| ----------- | ----------------------------- | -------- |
| `m9d7-ebf2` | Registration                  | 24 hours |
| `8ys7-d773` | Fuel records                  | 7 days   |
| `vezc-m2t6` | Bodies                        | 30 days  |
| `jhie-znh9` | Body specifications           | 30 days  |
| `3huj-srit` | Axles                         | 30 days  |
| `kmfi-hrps` | Vehicle classes               | 30 days  |
| `sgfe-77wx` | Inspection notifications      | 24 hours |
| `a34c-vvps` | Defect observations           | 24 hours |
| `hx2c-gt7k` | Defect reference descriptions | 7 days   |
| `t49b-isb7` | Exact recall statuses         | 24 hours |
| `j9yg-7rg9` | Recall campaigns              | 24 hours |
| `9ihi-jgpf` | Recall risks                  | 24 hours |
| `mu2x-mu5e` | Brand/model campaign mappings | 24 hours |
| `jqs4-4kvw` | Odometer explanations         | 7 days   |
| `byxc-wwua` | Exact type approval           | 30 days  |
| `7rjk-eycs` | Exact transmission approval   | 30 days  |

The main query succeeds before optional queries begin. Independent sources run in parallel, followed by dependent reference/detail enrichment. At most eight upstream calls run concurrently. An eight-second request timeout and an 8.5-second total query budget bound both network time and time waiting for a slot. The Next.js proxy remains 35 seconds. `RDW_TIMEOUT_SECONDS` can change the request timeout; review the proxy budget when raising it.

The source cache holds at most 2,000 query entries, including a shared defect-reference map. Default per-query limits are 1,000 rows and 2,000 for the reference catalogue. Results reaching the limit are marked incomplete. Notifications/defects order newest first. Exact recalls cap detail fan-out at 20 campaigns; possible model context shows at most five, with an explicit partial notice. These limits protect the upstream and do not claim exhaustive history.

The combined cache remains six hours by default and at most 60 seconds for warnings. It never extends an individual source's expiry. Cache hits still receive date analysis for today in Europe/Amsterdam.

`RDW_APP_TOKEN` is optional and server-only. Empty tokens send no header. Nonempty tokens use `X-App-Token` only on allowlisted HTTPS source requests. [Socrata documents this header](https://dev.socrata.com/docs/app-tokens). No `NEXT_PUBLIC_` variable contains the token.

## APK semantics

Notifications and observations match on plate, normalized calendar date, reporting time and recognition code. Numeric dates and ISO timestamp fields are supported. Only APK recognition records are included; unrelated inspection approvals are excluded. Missing notification records leave a clearly labeled defect-only event rather than inventing a passed inspection.

`gebrek_identificatie` joins to the reference descriptions applicable at the event date. Conflicting/missing descriptions stay unknown. Duplicate observations are deduplicated; conflicting counts remain unknown. Counts describe available records. Missing defect rows never become proof of a clean inspection or absence of damage.

Repeated categories require observations on multiple distinct dates, not multiple parts in one inspection. Categories derive from description keywords and are presented as historical observations, with underlying events visible.

For the actual G921GS snapshot there are two notifications: 15 October 2025 and 13 October 2023. The 2023 event has code 190, one wheel-bearing observation, and code 310, two brake-hose observations. The 2025 event has no matched defect records. It is not labeled as a complete problem-free history. Reference fixtures contain only relevant official description excerpts; the live reference cache loads the catalogue once per TTL.

## Analysis and truthful limits

`analysis.py` does not call external services. It computes age, import gap, registration duration, APK countdown, power per ton of ready mass, observed counts and structured warnings. Warning codes include all requested minimum rules: `APK_EXPIRED`, `APK_EXPIRING_SOON`, `MILEAGE_JUDGEMENT_ILLOGICAL`, `MILEAGE_NO_JUDGEMENT`, `LIKELY_IMPORTED`, `OPEN_RECALL`, `NOT_TRANSFERABLE`, `EXPORTED`, `WAITING_FOR_INSPECTION`, `REPEATED_APK_DEFECT` and `RECENT_REGISTRATION_CHANGE`. An explicit uninsured WAM record also gets a warning.

APK thresholds default to 60/30 days and registration recency to 30 days. They are configurable through the example environment file. Expiry day remains valid with an urgent reminder. Light passenger cars aged at least 50 retain the existing exemption handling. Unknown indicators such as `Geen verstrekking in Open Data` remain null.

Official payload takes precedence. Only missing official payload is derived from allowed mass minus ready mass, with a derived marker. Original registration dimension values are retained. Existing cm fields and exact-approval mm fields remain distinct; this change does not guess conversions for additional undocumented dimensions. NOx and explicit steering indicators are not present in the checked fuel/axle metadata and are not fabricated.

Model recall matching uses the registered make and normalized model-prefix words. It supplies context only; it never sets the per-plate indicator or `OPEN_RECALL` warning. Exact plate references are kept separate. Production period/execution and dealer confirmation remain necessary for model context.

Exact mileage/full NAP readings, previous owner counts/identities, current market value, complete maintenance/damage/inspection history and commercial option packages are not inferred. The optional attention score is not implemented; the app exposes reasons directly. The valuation protocol is ready for a future real market-data provider and has no fake response or public endpoint.

## Source-use review

The [current official open-data notice](https://www.rdw.nl/over-rdw/dienstverlening/open-data/bijsluiter) was checked on 7 October 2026. It mentions CC0, fair use, no availability/actuality guarantees, restrictions on RDW attribution and use of its logo/style. Public marketing now uses neutral source descriptions and RitVizier's own branding. Internal provenance retains exact datasets; links to the official check and the privacy explanation still identify their destination. Recheck this notice before any public production deployment. No legal approval or public deployment is claimed.

## Validation and local operation

Run the standard checks in `../CONTRIBUTING.md`. For the new browser flows alone, from `frontend/`:

```powershell
node ../node_modules/@playwright/test/cli.js test extended-rdw.spec.ts
```

Fixtures remain isolated from production. Live retrieval and cached timing were separately checked for G921GS. An independent uncached provider request took about 1.075 seconds and a warm provider lookup about 1 millisecond; the warm live API response was about 1.5 milliseconds. These are single-machine observations, not a production latency guarantee.

The current local frontend uses a dedicated loopback backend on port 8002 through ignored `frontend/.env.local`. The existing port-8000 process was left running after automatic approval rejected its termination. The standard fresh-checkout recipe still uses port 8000; inspect the local `BACKEND_URL` when troubleshooting. Runtime configuration and logs are not committed. Docker, a real PostgreSQL round trip and physical-device Safari remain unverified.
