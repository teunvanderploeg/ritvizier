import asyncio
import logging
from collections import OrderedDict
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.cache import VehicleCache
from app.providers.rdw import VehicleProvider
from app.schemas.vehicle import Vehicle

logger = logging.getLogger(__name__)


class VehicleService:
    def __init__(
        self,
        provider: VehicleProvider,
        ttl: int = 21600,
        sessions: async_sessionmaker[AsyncSession] | None = None,
    ):
        self.provider = provider
        self.ttl = ttl
        self.sessions = sessions
        self.cache: OrderedDict[str, tuple[datetime, Vehicle]] = OrderedDict()
        self.pending: dict[str, asyncio.Task[Vehicle]] = {}

    async def get_vehicle(self, plate: str) -> Vehicle:
        now = datetime.now(UTC)
        cached = self.cache.get(plate)
        if cached and cached[0] > now:
            self.cache.move_to_end(plate)
            return cached[1]
        if plate not in self.pending:
            self.pending[plate] = asyncio.create_task(self._fetch(plate))
            self.pending[plate].add_done_callback(lambda _: self.pending.pop(plate, None))
        return await asyncio.shield(self.pending[plate])

    async def _fetch(self, plate: str) -> Vehicle:
        now = datetime.now(UTC)
        if self.sessions:
            try:
                async with self.sessions() as session:
                    stored = await session.get(VehicleCache, plate)
                    if (
                        stored
                        and stored.expires_at > now
                        and stored.payload.get("source", {}).get("schemaVersion") == 2
                    ):
                        vehicle = Vehicle.model_validate(stored.payload)
                        self._remember(plate, stored.expires_at, vehicle)
                        return vehicle
            except (SQLAlchemyError, OSError, ValueError):
                logger.warning("Persistent cache read failed; using provider")
        vehicle = await self.provider.get_vehicle(plate)
        expires = now + timedelta(
            seconds=min(self.ttl, 60) if vehicle.source.warnings else self.ttl
        )
        self._remember(plate, expires, vehicle)
        if self.sessions:
            try:
                async with self.sessions() as session:
                    await session.merge(
                        VehicleCache(
                            plate=plate,
                            payload=vehicle.model_dump(mode="json", by_alias=True),
                            expires_at=expires,
                        )
                    )
                    await session.commit()
            except (SQLAlchemyError, OSError):
                logger.warning("Persistent cache write failed; using memory")
        return vehicle

    def _remember(self, plate: str, expires: datetime, vehicle: Vehicle) -> None:
        self.cache[plate] = (expires, vehicle)
        self.cache.move_to_end(plate)
        while len(self.cache) > 1000:
            self.cache.popitem(last=False)
