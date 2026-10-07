#!/usr/bin/env bash
set -Eeuo pipefail
compose=(docker compose --project-name ritvizier-smoke --env-file deploy/.env.example -f deploy/compose.yml)
cleanup() { "${compose[@]}" down --volumes; }
trap cleanup EXIT
"${compose[@]}" up -d --wait --wait-timeout 180
# Migration and a real PostgreSQL cache write/read/delete, without depending on RDW uptime.
"${compose[@]}" exec -T backend python - <<'PY'
import asyncio
from datetime import UTC, datetime, timedelta
from sqlalchemy import delete
from app.core.config import settings
from app.db.cache import VehicleCache, create_sessions

async def check():
    sessions = create_sessions(settings.database_url)
    async with sessions() as session:
        await session.merge(VehicleCache(plate='SMOKE1', payload={'smoke': True}, expires_at=datetime.now(UTC) + timedelta(hours=1)))
        await session.commit()
    async with sessions() as session:
        cached = await session.get(VehicleCache, 'SMOKE1')
        assert cached and cached.payload == {'smoke': True}
        assert cached.expires_at > datetime.now(UTC)
        await session.execute(delete(VehicleCache).where(VehicleCache.plate == 'SMOKE1'))
        await session.commit()
asyncio.run(check())
PY
curl --fail --silent "http://127.0.0.1:${HTTP_PORT:-3000}/" >/dev/null
status=$(curl --silent -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HTTP_PORT:-3000}/api/vehicles/INVALID")
test "$status" = 422
echo 'Container startup, migrations, PostgreSQL cache and frontend proxy passed.'
