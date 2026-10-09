# Configuration

Start with [Installation](install.md). Local templates are in [.env.example](../.env.example); production host settings are in [deploy/.env.example](../deploy/.env.example). Keep real credentials and runtime files out of Git.

## Where settings belong

| Location              | Consumer                                                           |
| --------------------- | ------------------------------------------------------------------ |
| `backend/.env`        | Native FastAPI process and Alembic migrations                      |
| `frontend/.env.local` | Local Next.js frontend                                             |
| Root `.env`           | Local Compose substitutions; also read by native backend settings  |
| VPS `.env`            | Production Compose host settings described in the deployment guide |

The backend reads root `.env` and then `backend/.env`. When both define a setting, `backend/.env` wins; process environment variables take precedence over the files. Avoid mixing local Docker database addresses with a native API configuration.

Restart the affected process after editing environment files. Rebuild the frontend when changing build-time public metadata, including the canonical site URL.

## Frontend and proxy

| Variable               | Local value             | Purpose                           |
| ---------------------- | ----------------------- | --------------------------------- |
| `BACKEND_URL`          | `http://127.0.0.1:8000` | Server-only FastAPI destination   |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public canonical URL and metadata |

The browser calls `/api/vehicles/{plate}`, `/api/costs`, `/api/road-tax` and `/api/listings` on the frontend. A phone does not need the backend's loopback address. Never prefix database credentials or the RDW token with `NEXT_PUBLIC_`.

If your own backend must use another port, change its startup command and `BACKEND_URL` together. The current maintainer's ignored local configuration uses port 8002; the fresh-install examples use 8000.

## Database and cache

| Variable            | Default | Purpose                               |
| ------------------- | ------- | ------------------------------------- |
| `DATABASE_URL`      | Empty   | Optional PostgreSQL persistence       |
| `CACHE_TTL_SECONDS` | `21600` | Maximum aggregate lifetime, six hours |

For a native PostgreSQL instance, use this connection-string shape with your actual values:

```text
postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
```

The uppercase fields are placeholders. URL-encode credentials containing reserved URL characters. Run [migrations](install.md#optional-persistent-cache) before starting the native API.

Without `DATABASE_URL`, the API holds at most 1,000 vehicles in memory. A restart clears that memory cache. PostgreSQL cache failures fall back to provider/memory behavior with logged warnings; `/health` alone does not prove persistent storage works.

Responses with source warnings expire within 60 seconds. Aggregate expiry cannot extend any source's freshness deadline. Persisted records require source schema version 3; older records refresh. Date-dependent analysis refreshes on cache hits. Browser collections are independent snapshots.

## RDW and warnings

| Variable                   | Default | Bounds or behavior                                         |
| -------------------------- | ------- | ---------------------------------------------------------- |
| `RDW_APP_TOKEN`            | Empty   | Optional SODA token, server-only; empty tokens are omitted |
| `RDW_TIMEOUT_SECONDS`      | `8`     | Greater than 0, at most 20 seconds                         |
| `APK_NOTICE_DAYS`          | `60`    | 1 to 365 days                                              |
| `APK_URGENT_DAYS`          | `30`    | 0 to 365 days                                              |
| `RECENT_REGISTRATION_DAYS` | `30`    | 1 to 365 days                                              |

No token is needed for normal public RDW retrieval. The allowlisted source client controls dataset-specific cache lifetimes and concurrency. Its query budget includes waiting for a request slot. Lookups have dependent stages; keep proxy and provider timeouts consistent. See [Architecture](architecture.md#cache-and-timeouts).

## CORS and request limits

| Variable                | Native default          | Purpose                                  |
| ----------------------- | ----------------------- | ---------------------------------------- |
| `CORS_ORIGINS`          | `http://localhost:3000` | Comma-separated allowed origins          |
| `RATE_LIMIT_PER_MINUTE` | `30`                    | Per-process limit based on connection IP |

Use comma-separated origins without spaces around entries. The API allows GET and POST with the Content-Type header. Normal browser traffic uses the frontend proxy.

Requests through Next.js share its backend IP bucket. Increasing the limit does not create a per-visitor limiter. Production Compose defaults the shared limit to 300; use a suitable edge or shared limiter when needed. Multiple API workers do not share their in-memory limiter or request coalescing.

## Optional listing snapshot

`LISTINGS_FILE` is a server-only path to a validated current JSON snapshot. Leave it empty to report listings as unavailable. Use an absolute path for native development so the working directory does not change its meaning.

The [listing guide](listing-search.md) documents CSV/JSON imports, required fields, duplicate rules and 24-hour freshness. Real stock exports belong outside Git. A mounted file alone does not configure a container; the API also needs `LISTINGS_FILE` pointing to its path inside that container.

## Container configuration

The local and production Compose files have different purposes:

| Stack                     | Settings passed by the checked-in configuration                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root `docker-compose.yml` | Requires `POSTGRES_PASSWORD`; sets backend database/CORS and frontend proxy; accepts a build-time `NEXT_PUBLIC_SITE_URL`                               |
| `deploy/compose.yml`      | Requires `SITE_URL`, `POSTGRES_PASSWORD` and checked frontend/backend image references; accepts HTTP binding, shared rate limit and optional RDW token |

Neither stack currently passes `LISTINGS_FILE` or mounts a stock snapshot. The root stack also does not pass `RDW_APP_TOKEN`, custom timeouts or warning thresholds. Add explicit Compose environment entries and a suitable read-only mount when configuring those optional capabilities. Do not assume every root `.env` value reaches a container.

For production, `HTTP_BIND_ADDRESS` defaults to `127.0.0.1` and `HTTP_PORT` to `3000`. A reverse proxy on another server needs a reachable binding and a firewall rule restricted to the proxy. Follow [the deployment guide](deployment.md) for the existing Oracle topology, image references, GitHub variables and SSH secrets.
