# Changelog

User-visible changes use semantic versions and annotated Git tags. Dates use the Europe/Amsterdam calendar.

## Unreleased

- Production Docker Compose stack with persistent PostgreSQL cache and private backend/database networking.
- GitHub checks now gate container build, PostgreSQL smoke verification, immutable GHCR images and optional automatic SSH deployment of `main`.
- Deployment setup documents secrets, HTTPS proxy, health checks and rollback to the previous healthy release.

## 1.1.0 - 2026-10-07

### Added

- Actual APK notifications and historical defect observations, with official date-valid descriptions, counts and chronological disclosures.
- All fuel/body records, body specifications, vehicle classes and expanded optional axle details.
- Separate possible brand/model recall context. It does not change the plate-specific indicator.
- Pure analysis with date/status warnings, repeated historical categories, APK thresholds and power per ton. Optional user-entered mileage produces a labeled annual average.
- Allowlisted source client with per-dataset caching, shared reference data, bounded concurrency, section provenance and optional server-only application token.
- A future market-data valuation protocol without fabricated values or a public valuation endpoint.
- Extended specification, implementation/file/source register and refreshed developer/AI handoff.

### Changed

- Cached vehicle source schema is now version 3; persisted v1/v2 records refresh, while older local browser collections remain readable.
- Invalid plates still return 422. Primary upstream failures now return 502, timeouts 504 and upstream throttling 429, with machine-readable codes and the existing friendly detail field.
- Aggregate freshness cannot outlive its underlying source deadline. Date analysis refreshes even on cache hits.
- Official payload takes precedence over the labeled fallback calculation. Unknown status indicators remain unknown.
- Source retrieval dates display on the Europe/Amsterdam calendar, including late-night UTC timestamps.
- Public source wording uses neutral descriptions and RitVizier branding after reviewing the current open-data notice.

### Validation and limits

- 133 tests: 24 frontend, 77 backend and 32 Chromium/WebKit browser checks. Lint, TypeScript, mypy, Ruff and production build pass.
- Live MINI source checks confirmed two notifications and three 2023 observations. Missing observations do not prove a clean history.
- Full mileage, owner/damage/maintenance histories, current market value and exhaustive inspection history remain unavailable. Possible model context is limited to five campaigns with a notice.
- Docker/live PostgreSQL integration, physical-device Safari and public deployment remain unverified. Git history is still local.

## 1.0.0 - 2026-10-07

First tagged local baseline. Earlier development remains in commit history.

### Added

- Dutch vehicle lookup from official RDW registration and additional datasets.
- Responsive sections, local saved/recent vehicles, comparison for up to three cars and persistent light/dark/system theme.
- Both colors, exact execution/transmission where available, odometer explanation, per-plate recall details and separate WLTP/NEDC consumption/emissions.
- Automatic provincial road tax from reviewed July-December 2026 tables, running-cost estimation and manual override.
- Production runtime, frontend/backend/browser checks, GitHub Actions and live/LAN smoke scripts.
- Short appearance animations for content, cards, menus, explanations and tax results, respecting reduced motion.
- Branch/release workflow, architecture, developer handoff and root coding-agent instructions.

### Fixed

- LAN development asset access so plate inputs work on other local devices.
- Registration year displays `2026` rather than `2.026`.
- Text contrast in the vehicle cost prompt.

### Known limits

- History/tags are local; no remote or public deployment is configured.
- Exact mileage, complete inspection/maintenance/damage history and all commercial options are not available from the used public sources.
- Tariffs expire after December 2026; unsupported/expired tax calculations report unavailable.
- Live PostgreSQL/container integration and physical-device Safari have not been verified.
