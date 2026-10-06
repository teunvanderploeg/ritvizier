# Changelog

User-visible changes use semantic versions and annotated Git tags. Dates use the Europe/Amsterdam calendar.

## Unreleased

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
