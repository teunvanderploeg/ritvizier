"""Deterministic browser-test server. Never imported by the production application."""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from app.main import app, settings
from app.providers.rdw import VehicleNotFound
from app.schemas.vehicle import Vehicle
from app.services.vehicles import VehicleService


class FixtureProvider:
    async def get_vehicle(self, plate: str) -> Vehicle:
        records = json.loads((Path(__file__).parent / "fixtures" / "vehicles.json").read_text())
        if plate not in records:
            raise VehicleNotFound()
        return Vehicle.model_validate(records[plate])


@asynccontextmanager
async def fixture_lifespan(application):
    settings.rate_limit_per_minute = 1000
    application.state.vehicle_service = VehicleService(FixtureProvider())
    yield


app.router.lifespan_context = fixture_lifespan
