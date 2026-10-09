# Installation

This guide covers local development with the real RDW provider. For a public server, follow [VPS deployment](deployment.md). For environment variables, see [Configuration](configuration.md).

## Requirements

| Tool            | Requirement                                                            |
| --------------- | ---------------------------------------------------------------------- |
| Git             | Clone and update the repository                                        |
| Node.js and npm | Node.js 22.12+; install dependencies with the root `package-lock.json` |
| Python          | Python 3.12+ with virtual-environment support                          |
| PostgreSQL      | Optional, version 16+ for persistent caching                           |
| Docker          | Optional alternative; the local Compose stack includes PostgreSQL 17   |

RDW lookups need internet access. No RDW API key, database or user account is required for the default local setup.

## Get the repository

```sh
git clone https://github.com/twanterstappen/ritvizier.git
cd ritvizier
```

If you already have a checkout, use it and preserve any local changes. All commands below start in the repository root unless stated otherwise.

## Windows with PowerShell

Install frontend and backend dependencies:

```powershell
npm ci
python -m venv .venv
.venv\Scripts\python -m pip install -e "backend[dev]"
```

If `python` points to another version, use `py -3.12 -m venv .venv`. Calling the virtual environment directly avoids requiring a PowerShell activation-policy change.

Create configuration files only if they do not already exist:

```powershell
if (-not (Test-Path backend/.env)) {
    Copy-Item .env.example backend/.env
}
if (-not (Test-Path frontend/.env.local)) {
    Copy-Item .env.example frontend/.env.local
}
```

Leave `DATABASE_URL` and `LISTINGS_FILE` empty for the basic setup. Start the backend:

```powershell
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

In a second terminal, from the same repository root:

```powershell
npm run dev
```

## macOS or Linux

Use the same npm workspace and a Python virtual environment:

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -e 'backend[dev]'
test -f backend/.env || cp .env.example backend/.env
test -f frontend/.env.local || cp .env.example frontend/.env.local
.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Confirm `python3` is version 3.12 or newer before creating the environment. In a second terminal, run `npm run dev` from the repository root. This section translates the repository commands for a POSIX shell; it does not claim a fresh macOS installation was tested. See [Verification](verification.md) for recorded platform checks.

## Confirm the setup

| Address                                         | Expected result                            |
| ----------------------------------------------- | ------------------------------------------ |
| [Frontend](http://localhost:3000)               | Dutch license-plate search                 |
| [API health](http://127.0.0.1:8000/health)      | `{"status":"ok"}`                          |
| [API documentation](http://127.0.0.1:8000/docs) | Interactive FastAPI endpoint documentation |

Search for a real Dutch plate. A successful health response only confirms the API process responds; a lookup separately checks RDW access. For the repository's live lookup and cost check on Windows:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8000
```

The script uses GZS88X and checks source metadata and cost results. It makes real RDW requests. Stop each server with Ctrl+C in its own terminal.

## Use another device on your network

With `npm run dev` running, open your computer's IPv4 address on port 3000 from a device on the same network. For example, use `http://192.168.50.205:3000` with your actual address substituted. Only the frontend port needs to be reachable; backend requests go through its proxy.

Allow the frontend through your local firewall if needed. Restart the development server after changing networks so its allowed development addresses refresh. To check the LAN path with installed Playwright engines:

```powershell
npx playwright install chromium webkit
node scripts/check-lan.mjs http://192.168.50.205:3000
```

## Optional persistent cache

Create a PostgreSQL database and user you control. Set `DATABASE_URL` in `backend/.env` using the `postgresql+asyncpg://` scheme and your actual credentials. See [Configuration](configuration.md#database-and-cache).

Run migrations from `backend/` before starting the API. On Windows:

```powershell
Set-Location backend
..\.venv\Scripts\python -m alembic upgrade head
Set-Location ..
```

On macOS or Linux:

```sh
cd backend
../.venv/bin/python -m alembic upgrade head
cd ..
```

Restart the backend after changing its environment. PostgreSQL stores shared vehicle cache records, not browser favourites or accounts.

## Alternative local Docker setup

The root [docker-compose.yml](../docker-compose.yml) starts the database, API and frontend together. You do not need to start the native servers above. Stop your own conflicting servers before using the same ports.

Copy [.env.example](../.env.example) to a root `.env` if you do not already have one. Set `POSTGRES_PASSWORD` to a random 64-character hex value. One way to generate it with the installed Python is:

```sh
python -c "import secrets; print(secrets.token_hex(32))"
```

Keep the generated value in your ignored local `.env`, then run:

```sh
docker compose up --build
```

Open [localhost:3000](http://localhost:3000). Migrations run automatically before the container API starts. The API and database ports bind to host loopback; the frontend publishes port 3000.

To stop the local stack while retaining its database volume:

```sh
docker compose down
```

The root Compose file passes a defined subset of settings to containers. Copying variables into `.env` does not automatically configure optional RDW tokens or listing imports. See [Configuration](configuration.md#container-configuration).

## Next steps

- Follow [Contributing](../CONTRIBUTING.md#checks-by-change) for checks appropriate to your change.
- Use [Listing search](listing-search.md) to connect an authorized current stock export.
- Use [Troubleshooting](troubleshooting.md) for startup, proxy, browser and data issues.
- Use [VPS deployment](deployment.md) for production HTTPS, image deployment and persistent storage.
