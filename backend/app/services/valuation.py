"""Extension contract for a future provider backed by actual market samples."""

from typing import Literal, Protocol

from app.schemas.vehicle import ApiModel


class ValuationInput(ApiModel):
    make: str
    model: str
    first_registration: str
    fuel: list[str]
    power_kw: float | None = None
    power_hp: int | None = None
    mileage: int | None = None
    body_type: str | None = None
    transmission: str | None = None


class ValuationResult(ApiModel):
    low: float | None = None
    estimate: float | None = None
    high: float | None = None
    confidence: float | None = None
    sample_size: int | None = None
    source: Literal["market-model"] = "market-model"


class ValuationProvider(Protocol):
    async def estimate(self, values: ValuationInput) -> ValuationResult: ...
