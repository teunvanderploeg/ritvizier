# RitVizier instructions for coding agents

## Start here

Read `README.md`, `CONTRIBUTING.md`, `docs/architecture.md` and `docs/handoff.md` before editing. Read `docs/verification.md` to distinguish verified behavior from untested deployment assumptions. Follow directory-specific instructions, including `frontend/AGENTS.md`.

Inspect `git status --short`, the current branch and recent commits. Preserve work that is already present. Do not reset, overwrite, stash or commit another contributor's changes as your own.

## Git and documentation

- Start new tasks from `main` on a short-lived `feat/`, `fix/`, `docs/`, `test/`, `refactor/` or `chore/` branch. Do not implement changes directly on `main`.
- Use Conventional Commits with a concrete subject. Keep unrelated changes in separate commits.
- Complete relevant checks before merging. Use a merge commit to preserve branch history as described in `CONTRIBUTING.md`.
- Never force-push, rewrite existing commits or move a published version tag without an explicit user request.
- Update documentation when setup, API contracts, data sources, calculations or operations change. Add user-visible changes to the unreleased changelog.
- Explicit user instructions and authorization take precedence. These conventions do not add an approval requirement to an authorized task.
- A local commit or tag is not an online backup. Check `git remote -v` before claiming code has been pushed or a pull request exists.

## Project boundaries

The frontend uses Next.js App Router, React, TypeScript, Zod, Lucide and custom CSS. The backend uses FastAPI, Pydantic, httpx and optional PostgreSQL cache storage. Use npm with `package-lock.json` and the repository Python virtual environment.

Keep RDW retrieval, normalization and calculations in `backend/app/`. The browser calls Next.js proxy routes rather than a hardcoded backend address. Update both `backend/app/schemas/vehicle.py` and `frontend/src/types/vehicle.ts` when changing the vehicle contract. Preserve compatibility with older saved vehicles and cached records.

For source/analysis changes, read `docs/extended-rdw-check.md`. Use the allowlisted source client, preserve per-section provenance and source expiry bounds, and refresh date-dependent analysis on cache hits. Current persisted source schema is version 3. APK observations without a matching notification remain labeled separately. Model recall context must never change the plate-specific warning.

Read the installed Next.js documentation under `node_modules/next/dist/docs/` before changing Next.js behavior. The current version is 16.4.0; the package is installed at the monorepo root. Do not assume older-version APIs apply.

## Data rules

- Missing values stay null and appear as unavailable. Never fabricate mileage, recalls, owner history, damage, maintenance or commercial option packages.
- Production retrieval uses the real RDW provider. Fixtures and synthetic recalls belong only in tests.
- Join type approvals by complete approval number, variant and execution code. Conflicting rows and ranges must not become guessed single values.
- Retain both registered colors and separate WLTP/NEDC figures. Label derived values and editable assumptions.
- Recall repair status means the producer reported repair. The app does not independently verify repair.
- Road tax uses the selected province, RDW massa rijklaar, fuel and a reviewed tariff validity period. Unsupported or expired calculations return an unavailable reason, never zero as a fallback.
- Preserve explicit diesel particulate and LPG installation choices. Label the subtotal as excluding tax until tax is known.
- Optional-source failures preserve core registration with warnings. Keep timeouts consistent with the two-stage RDW lookup.

## Interface and checks

Match existing tokens, spacing and mobile controls. Preserve keyboard access, visible focus and reduced-motion support. Format years as plain years, not grouped numbers. Prevent page-level horizontal overflow; the vehicle tab strip intentionally scrolls horizontally.

Choose checks using `CONTRIBUTING.md`. Verify changed interactions in Chromium and WebKit. Inspect desktop and small-phone screenshots for layout changes. Keep generated evidence in ignored `artifacts/`.

Report the checks actually performed and material limitations. Do not claim physical-device Safari testing, Docker verification, PostgreSQL integration or public deployment without performing them.
