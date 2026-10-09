# Troubleshooting

Start with [Installation](install.md) and [Configuration](configuration.md). The checks here help diagnose a running checkout; they are not new verification results. [Verification](verification.md) records tests and deployments actually performed.

## The app does not start

| Symptom                                                   | Check and action                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm command fails or dependencies are missing             | Confirm Node.js 22.12+ and run `npm ci` from the repository root, using its lockfile                                                                |
| Python cannot import `app`, FastAPI or another dependency | Use the repository virtual environment and install `backend[dev]`; start with `--app-dir backend` from the root                                     |
| Port is already in use                                    | Inspect the existing process before stopping anything. Stop your own server in its terminal or choose another backend port and update `BACKEND_URL` |
| Database migration requires configuration                 | Set `DATABASE_URL` for Alembic and run migrations from `backend/` using the virtual environment                                                     |
| Docker refuses a missing password                         | Set your own random hex `POSTGRES_PASSWORD` in the root `.env`; there is no built-in password                                                       |
| Production frontend cannot find standalone files          | Run `npm run build` before `npm start`                                                                                                              |

On Windows, inspect listeners without terminating them:

```powershell
Get-NetTCPConnection -State Listen |
    Where-Object { $_.LocalPort -in 3000, 8000, 8002, 3100, 8001 } |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Use the process ID to inspect the relevant process. Keep existing contributors' servers and environment files intact.

## Vehicle lookup fails

Check the API process, then the frontend proxy, then RDW retrieval. On Windows, with the default backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://localhost:3000/api/vehicles/G921GS
```

Replace ports to match your configuration. The first response should contain `status: ok`. The second makes a real lookup through the frontend. If the health request fails, inspect backend startup and logs. If health succeeds but the frontend request fails, check `BACKEND_URL`, frontend logs and connectivity to RDW.

| HTTP response | Meaning and next step                                                    |
| ------------- | ------------------------------------------------------------------------ |
| 422           | Invalid plate, input or query; check the submitted values                |
| 404           | No vehicle found for the normalized plate                                |
| 429           | Local limiter or upstream throttling; honor `Retry-After` where supplied |
| 502           | Provider or proxy upstream failure; inspect response code and logs       |
| 503           | API unavailable, including some frontend proxy failures                  |
| 504           | RDW lookup timeout; inspect upstream access and timeout settings         |

Backend vehicle errors include a readable `detail` and machine-readable `code`. Optional-source failures can still return a successful vehicle response with section warnings. Inspect source status and retrieval timestamps before treating a missing field as a defect in the interface.

## Phone input stays disabled or the LAN page does not load

Confirm both devices use the same network and that the frontend port is reachable through the local firewall. Use the computer's IPv4 address rather than `localhost` on the phone.

Restart `npm run dev` after changing networks. Development addresses are collected at startup; rejected asset requests can prevent hydration and leave the input disabled. With Playwright engines installed:

```powershell
node scripts/check-lan.mjs http://192.168.50.205:3000
```

Replace the address with the actual computer address. This checks the LAN path in Chromium and WebKit; it does not establish physical-device Safari behavior. Keep the input's hydration safeguard in place.

## A field or history record is missing

Public RDW data does not guarantee complete mileage, APK, maintenance, damage or owner history. Missing values stay unavailable. Check the section's source warning and dataset before assuming retrieval failed.

Type approvals need an exact full approval number, variant and execution match. Conflicting results remain unavailable. APK observations without a matching notification remain separate. General model campaigns do not prove an open action for the searched plate.

Vehicle pages retrieve current data when opened. Favourites and recent entries are browser snapshots. Normal aggregate caching lasts at most six hours, bounded by source expiry; warning responses retry sooner. A backend restart clears memory caching but does not remove PostgreSQL records or browser snapshots. Do not clear all saved browser data as a first diagnostic step.

## Road tax is unavailable

Check the province, RDW massa rijklaar, fuel/category and tariff validity. Diesel needs the particulate-surcharge choice; LPG needs the installation class. The reviewed snapshot covers July to December 2026. Unsupported categories, oldtimer cases and dates after its validity return unavailable.

An unavailable result is not zero tax. The displayed subtotal excludes tax until it is known or manually entered. Follow [the README tariff-update instructions](../README.md#running-costs-and-road-tax) before extending validity; downloading a new asset alone is insufficient.

## Listings are unavailable or duplicates remain separate

Verify `LISTINGS_FILE` points to a readable current snapshot for the API process. Check the importer output and real observation timestamps. The API rejects stale, malformed or oversized feeds and does not refresh old adverts by changing the envelope date.

For containers, pass `LISTINGS_FILE` explicitly and mount the snapshot at the corresponding container path. The current Compose files do not configure a listing feed. Similar titles and prices do not establish duplicate identity. See [Listing search](listing-search.md) for exact requirements.

## Browser tests cannot start

Build first, install engines and ensure ports 3100 and 8001 are free:

```powershell
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Windows uses `.venv/Scripts/python.exe` for the fixture API by default. The Playwright configuration also accepts `PYTHON_EXECUTABLE`. On a POSIX shell, select the project environment explicitly if `python` is not already that environment:

```sh
PYTHON_EXECUTABLE="$PWD/.venv/bin/python" npm run test:e2e
```

For filtered Windows tests, use [the direct Playwright invocation](../CONTRIBUTING.md#checks-by-change) to avoid nested npm argument forwarding. If WebKit fails before startup because DLLs cannot load, report the host limitation. The recorded Linux CI checks provide separate browser evidence; a startup failure is not a passing WebKit test.

## Production diagnostics

Use [VPS deployment](deployment.md) for host settings, container health, release selection and rollback. Inspect the actual workflow deploy job and VPS `current-release` file before declaring a revision deployed. A successful build or enabled deployment variable alone is insufficient.

The recorded Oracle rollout verified public HTTPS and a PostgreSQL cache write. Failed-release recovery, database restore and certificate renewal still need separate operational evidence. Preserve that distinction when updating [Verification](verification.md).
