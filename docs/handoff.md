# Developer handoff

Updated 7 October 2026. The first tagged baseline is `v1.0.0`. Use `git log --graph --oneline --decorate --all` for exact history. At this handoff no remote is configured; all commits, branches and tags are local.

## First session

Read [Agent instructions](../AGENTS.md), [Contributing](../CONTRIBUTING.md), [Architecture](architecture.md) and [Verification](verification.md). Inspect the branch, working tree and history. Start the next task from `main` on a new branch. Follow the README setup with the normal API on port 8000 and frontend on port 3000.

## Current behavior

- Dutch plate lookup and direct `/auto/{formatted-plate}` links.
- Vehicle sections for overview, APK/registration, odometer/history, recalls, execution, engine, emissions, dimensions, costs and practical information.
- Both colors, execution identifiers, exact transmission where available, separate WLTP/NEDC data and source links.
- Per-plate recalls with defects, risks, remedy and producer-reported repair status.
- Automatic provincial road tax, editable monthly/yearly running costs and manual tax override.
- Local recent/saved/comparison collections, persistent theme and mobile navigation.
- Short content transitions with reduced-motion support. Registration year is `2026`, without a thousands separator.

## Regression vehicle

G921GS is a MINI Countryman Cooper used for live checks and fixture snapshots. The 6 October 2026 snapshot has Groen/Zwart, FMX/YW31/DAW500L0, automatic transmission with 7 gears, odometer judgment Logisch with registration year 2026, and no pending recall indicator or linked public campaign.

Consumption is 6.9 l/100 km WLTP and 5.4 NEDC; CO2 is 157 g/km WLTP and 122 NEDC; massa rijklaar is 1,490 kg. Reviewed 2026 tax is EUR 226 per quarter in Noord-Holland and EUR 247 in Zuid-Holland. These are fixture expectations, not a promise that live data cannot change.

Raw sources are in `backend/tests/fixtures/rdw-mini.json`, normalized browser records in `backend/tests/fixtures/vehicles.json`. Synthetic recalls exist only in tests. Production must keep using the real provider.

## Next maintenance work

| When                                     | Work                                                                                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before January 2027                      | Review/update tax tariffs. The snapshot expires after December 2026 and returns unavailable beyond validity. Follow the updater instructions and compare with the official calculator. |
| When online version control is requested | Connect the chosen remote, push history/tags and configure branch protection with required CI. Local Git is not an off-device backup.                                                  |
| Before public deployment                 | Choose hosting/TLS, set canonical URL and trusted proxy handling, and address the shared proxy-IP rate bucket for multiple users/workers.                                              |
| Before persistent cache in production    | Exercise real PostgreSQL migrations, reads, expiry and failure fallback. Docker/live database integration remains unverified.                                                          |

## Known limits

The used public sources do not supply exact mileage, full inspection/maintenance or damage history, previous owner identities/counts or every commercial option package. Theft/road-ban status currently points to the official RDW check. General model recalls do not prove this plate has an open action. Exact approval data needs an unambiguous match.

Tax covers supported passenger-car cases, excluding personal exemptions and suspension. Costs omit depreciation, finance and purchase price. The install manifest exists; a service worker and offline data caching do not. Chromium/WebKit tests are not physical-device Safari tests. There is no public deployment.

## Troubleshooting

| Symptom                        | First check                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAN plate input stays disabled | Restart dev server after IPv4 changes, check development origins and run `node scripts/check-lan.mjs http://<local-ip>:3000`. Keep hydration safeguards. |
| Lookup fails                   | Check `/health`, server-only `BACKEND_URL` and logs. Process health does not establish RDW reachability.                                                 |
| New RDW field stays missing    | Check source warnings, exact joins and cache freshness. Normal data caches six hours; warnings retry within 60 seconds.                                  |
| Browser tests cannot start     | Free 3100/8001, install engines and build first. Use the repository Python environment.                                                                  |
| Filtered tests find nothing    | Use the direct Playwright command in `CONTRIBUTING.md`; nested npm/PowerShell forwarding can lose `--grep`.                                              |
| Tax unavailable                | Check province, tariff date, category/weight and required diesel/LPG choices. Never substitute zero.                                                     |
| Old saved record disappears    | Check Zod defaults and the legacy-storage regression test.                                                                                               |

Update this handoff when behavior or operations change. Record dated evidence in `verification.md`.
