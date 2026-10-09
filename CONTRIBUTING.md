# Contributing to RitVizier

Setup is in [Installation](docs/install.md), environment settings in [Configuration](docs/configuration.md), the code/data map in [Architecture](docs/architecture.md), and maintenance priorities in [Developer handoff](docs/handoff.md). Use [Troubleshooting](docs/troubleshooting.md) for local issues. Human and AI contributions follow the same workflow.

## Branch workflow

`main` holds integrated, checked work. Each task gets a branch. `origin` points to the GitHub repository. Branch protection is configured separately in GitHub settings.

Inspect the working tree first. Do not discard another contributor's changes.

```powershell
git status --short
git switch main
git switch -c fix/short-description
```

When `origin` is configured, fetch and update `main` with `git pull --ff-only` before branching. Use a purpose and short description, for example `feat/recall-details`, `fix/year-formatting` or `docs/api-contract`.

Commit related code, tests and documentation together. Stage named paths and inspect the staged diff.

```powershell
git add path/to/changed-file
git diff --cached
git commit -m "fix(ui): display registration year correctly"
```

Commit subjects use `<type>(<scope>): <description>`. Types are `feat`, `fix`, `docs`, `test`, `refactor` and `chore`. Use an imperative subject of at most 50 characters. Add `!` and a breaking-change explanation for incompatible supported contracts.

After checks pass, integrate with a merge commit so the task branch remains visible in history.

```powershell
git switch main
git merge --no-ff fix/short-description -m "Merge fix/short-description"
git log --graph --oneline --decorate -12
```

If a remote exists, push the task branch and use a pull request for review. Explain the problem, resulting behavior, validation and limitations. `.github/workflows/ci.yml` already runs frontend, backend and browser jobs on GitHub pushes and pull requests. Configure GitHub branch protection separately after connecting a remote.

Keep branches focused. Completed branches may be deleted after integration; their merge commits retain the history. Never force-push shared branches or move release tags.

## Checks by change

| Change                          | Validation                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Documentation                   | Verify commands, paths and links against the repository; `git diff --check`                           |
| Frontend behavior/styles        | Lint, typecheck, unit tests and build; relevant browser tests and desktop/mobile review               |
| Backend/API/calculations        | pytest, Ruff and mypy; browser tests if the contract or displayed result changes                      |
| Shared vehicle contract/storage | Both sets of checks, browser regression and older stored-record compatibility                         |
| RDW provider                    | Provider tests and explicit live smoke lookup; missing-data and partial-source behavior               |
| Tax tariffs/formula             | Boundary tests, source metadata and comparison with the official calculator before extending validity |
| Migrations/deployment           | Validate migration SQL and build; document whether a real database/container/deployment was exercised |

Full commands from the repository root:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
.venv\Scripts\python -m pytest backend/tests
.venv\Scripts\python -m ruff check backend
.venv\Scripts\python -m mypy backend/app
```

Browser tests require a production build and free ports 3100/8001. They start an isolated frontend and fixture API, leaving the normal backend on port 8000 intact. Install engines once with `npx playwright install chromium webkit`. For filtered tests on Windows, invoke Playwright directly to avoid nested npm forwarding losing flags:

```powershell
Set-Location frontend
node ../node_modules/@playwright/test/cli.js test --grep "tab transitions"
Set-Location ..
```

Record checks that actually ran. Keep useful screenshots in ignored `artifacts/`. Test behavior and regressions rather than mirroring trivial implementation details.

Deployment changes also require container builds and `scripts/container-smoke.sh`. CI starts real PostgreSQL and verifies migrations/cache writes before publishing the checked image digests. Main deployment is enabled through `DEPLOY_ENABLED`; see [deployment setup](docs/deployment.md). Feature branches and pull requests run checks without deploying.

## Versions and releases

Annotated tags identify checked snapshots. `v1.0.0` is the first tagged local baseline. Earlier development remains in commit history.

Use semantic versions: patch for compatible fixes, minor for compatible features, major for incompatible supported contracts. Before tagging:

1. Integrate the intended branches and run all release checks above.
2. Update `CHANGELOG.md` with version, date, behavior and known limits.
3. On a release branch, update the frontend package version, npm lockfile workspace version, backend project version and FastAPI metadata version consistently. Check and merge that branch.
4. Create an annotated tag on the checked `main` commit.

```powershell
git tag -a v1.0.1 -m "RitVizier 1.0.1"
git show v1.0.1 --stat
```

When `origin` exists, push `main` and the specific release tag. Local tags alone are not an off-device backup. Create or publish a remote destination only when the user asks.

Inspect an older version without disturbing the current checkout:

```powershell
git show v1.0.0:README.md
git worktree add --detach ../ritvizier-v1.0.0 v1.0.0
```

The new worktree needs dependencies and its own environment files. Remove it with `git worktree remove ../ritvizier-v1.0.0` when no needed changes remain. For shared-history fixes, use a revert commit or new branch rather than `git reset --hard`.

## Documentation maintenance

- `README.md` contains setup and document links.
- `docs/install.md` covers first-run native, database and local Docker setup.
- `docs/configuration.md` documents environment settings and container differences.
- `docs/troubleshooting.md` contains diagnostic steps and known failure cases.
- `AGENTS.md` contains instructions for coding agents.
- `docs/architecture.md` maps code, requests, sources and storage.
- `docs/handoff.md` records current behavior, limits and maintenance work.
- `docs/verification.md` records evidence and unverified scenarios.
- `CHANGELOG.md` records released behavior.

Do not commit credentials, `.env` files, runtime output, browser storage, dependencies or generated builds. `.gitignore` excludes these. Keep examples free of credentials.
