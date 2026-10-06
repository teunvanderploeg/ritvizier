from collections import OrderedDict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import monotonic

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.plates import normalize_plate
from app.db.cache import create_sessions
from app.providers.rdw import ProviderUnavailable, RdwProvider, VehicleNotFound
from app.schemas.vehicle import Vehicle
from app.services.costs import CostAssumptions, CostEstimate, calculate_costs
from app.services.road_tax import RoadTaxEstimate, RoadTaxRequest, calculate_road_tax
from app.services.vehicles import VehicleService


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(12.0, connect=5.0), follow_redirects=False
    ) as client:
        sessions = create_sessions(settings.database_url) if settings.database_url else None
        app.state.vehicle_service = VehicleService(
            RdwProvider(client), settings.cache_ttl_seconds, sessions
        )
        yield


app = FastAPI(title="RitVizier API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
requests: OrderedDict[str, deque[float]] = OrderedDict()


@app.middleware("http")
async def secure_headers(request: Request, call_next: object) -> Response:
    # The public proxy never forwards user-supplied identity headers to this API.
    from typing import cast

    from starlette.middleware.base import RequestResponseEndpoint

    response = await cast(RequestResponseEndpoint, call_next)(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


def check_rate(request: Request) -> None:
    key = request.client.host if request.client else "unknown"
    now = monotonic()
    entries = requests.setdefault(key, deque())
    requests.move_to_end(key)
    while entries and now - entries[0] >= 60:
        entries.popleft()
    if len(entries) >= settings.rate_limit_per_minute:
        raise HTTPException(
            429,
            "Je zoekt even te snel. Probeer het over een minuut opnieuw.",
            headers={"Retry-After": "60"},
        )
    entries.append(now)
    while len(requests) > 10000:
        requests.popitem(last=False)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/vehicles/{plate}", response_model=Vehicle)
async def get_vehicle(plate: str, request: Request) -> Vehicle:
    check_rate(request)
    try:
        normalized = normalize_plate(plate)
    except ValueError:
        raise HTTPException(
            422, "Dit kenteken lijkt niet geldig. Controleer het kenteken en probeer opnieuw."
        ) from None
    service: VehicleService = request.app.state.vehicle_service
    try:
        return await service.get_vehicle(normalized)
    except VehicleNotFound:
        raise HTTPException(404, "We konden geen voertuig vinden voor dit kenteken.") from None
    except ProviderUnavailable:
        raise HTTPException(
            503, "De voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer het zo opnieuw."
        ) from None


@app.post("/api/costs", response_model=CostEstimate)
async def estimate_costs(values: CostAssumptions, request: Request) -> CostEstimate:
    check_rate(request)
    return calculate_costs(values)


@app.post("/api/road-tax", response_model=RoadTaxEstimate)
async def estimate_road_tax(values: RoadTaxRequest, request: Request) -> RoadTaxEstimate:
    vehicle = await get_vehicle(values.license_plate, request)
    return calculate_road_tax(vehicle, values)
