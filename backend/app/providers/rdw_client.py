"""Bounded, server-only SODA client with an allowlisted source registry."""

import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from datetime import UTC, datetime
from time import monotonic
from typing import Any

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class Dataset:
    section: str
    ttl: int
    filters: tuple[str, ...] = ("kenteken",)
    limit: int = 1000
    order: str | None = None


DAY = 86400
SECTION_LABELS = {
    "registration": "registratie",
    "fuel": "brandstof",
    "axles": "assen",
    "body": "carrosserie",
    "bodySpecifications": "carrosseriespecificaties",
    "vehicleClasses": "voertuigklassen",
    "inspectionNotifications": "keuringsmeldingen",
    "inspectionDefects": "geregistreerde gebreken",
    "defectDescriptions": "gebrekomschrijvingen",
    "recallStatuses": "terugroepstatus",
    "recallCampaigns": "terugroepacties",
    "recallRisks": "terugroeprisico's",
    "possibleRecalls": "mogelijke merk/type-acties",
    "odometerExplanation": "tellerstandtoelichting",
    "typeApproval": "typegoedkeuring",
    "transmission": "transmissie",
}
DATASETS = {
    "m9d7-ebf2": Dataset("registration", DAY),
    "8ys7-d773": Dataset("fuel", 7 * DAY),
    "3huj-srit": Dataset("axles", 30 * DAY),
    "vezc-m2t6": Dataset("body", 30 * DAY),
    "jhie-znh9": Dataset("bodySpecifications", 30 * DAY),
    "kmfi-hrps": Dataset("vehicleClasses", 30 * DAY),
    "sgfe-77wx": Dataset(
        "inspectionNotifications",
        DAY,
        order="meld_datum_door_keuringsinstantie DESC,meld_tijd_door_keuringsinstantie DESC",
    ),
    "a34c-vvps": Dataset(
        "inspectionDefects",
        DAY,
        order="meld_datum_door_keuringsinstantie DESC,meld_tijd_door_keuringsinstantie DESC",
    ),
    "hx2c-gt7k": Dataset("defectDescriptions", 7 * DAY, (), 2000),
    "t49b-isb7": Dataset("recallStatuses", DAY),
    "j9yg-7rg9": Dataset("recallCampaigns", DAY, ("referentiecode_rdw",)),
    "9ihi-jgpf": Dataset("recallRisks", DAY, ("referentiecode_rdw",)),
    "mu2x-mu5e": Dataset("possibleRecalls", DAY, ("merk",)),
    "jqs4-4kvw": Dataset("odometerExplanation", 7 * DAY, ("code_toelichting_tellerstandoordeel",)),
    "byxc-wwua": Dataset(
        "typeApproval", 30 * DAY, ("typegoedkeuringsnummer", "codevarianttgk", "codeuitvoeringtgk")
    ),
    "7rjk-eycs": Dataset(
        "transmission", 30 * DAY, ("typegoedkeuringsnummer", "codevarianttgk", "codeuitvoeringtgk")
    ),
}


class ProviderUnavailable(Exception):
    def __init__(self, code: str = "rdw_unavailable") -> None:
        self.code = code
        super().__init__(code)


@dataclass
class CachedRows:
    rows: list[dict[str, Any]]
    fetched_at: datetime
    expires_at: float


QueryKey = tuple[str, tuple[tuple[str, str], ...]]


class RdwClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client
        self.cache: OrderedDict[QueryKey, CachedRows] = OrderedDict()
        self.pending: dict[QueryKey, asyncio.Task[CachedRows]] = {}
        self.slots = asyncio.Semaphore(8)

    async def query(self, dataset: str, params: dict[str, str]) -> list[dict[str, Any]]:
        spec = DATASETS.get(dataset)
        if spec is None or not set(params).issubset(spec.filters):
            raise ValueError("Dataset or filter is not allowlisted")
        key = (dataset, tuple(sorted(params.items())))
        cached = self.cache.get(key)
        if cached and cached.expires_at > monotonic():
            self.cache.move_to_end(key)
            return cached.rows
        if key not in self.pending:
            task = asyncio.create_task(self._load(dataset, params, spec))
            self.pending[key] = task
            task.add_done_callback(lambda _: self.pending.pop(key, None))
        loaded = await asyncio.shield(self.pending[key])
        self.cache[key] = loaded
        self.cache.move_to_end(key)
        while len(self.cache) > 2000:
            self.cache.popitem(last=False)
        return loaded.rows

    def fetched_at(self, dataset: str, params: dict[str, str]) -> datetime:
        entry = self.cache.get((dataset, tuple(sorted(params.items()))))
        return entry.fetched_at if entry else datetime.now(UTC)

    async def _load(self, dataset: str, params: dict[str, str], spec: Dataset) -> CachedRows:
        query = {**params, "$limit": str(spec.limit)}
        if spec.order:
            query["$order"] = spec.order
        token = settings.rdw_app_token.get_secret_value() if settings.rdw_app_token else ""
        headers = {"X-App-Token": token} if token else {}
        try:
            async with asyncio.timeout(settings.rdw_timeout_seconds + 0.5):
                async with self.slots:
                    response = await self.client.get(
                        f"https://opendata.rdw.nl/resource/{dataset}.json",
                        params=query,
                        headers=headers,
                        timeout=httpx.Timeout(settings.rdw_timeout_seconds, connect=5),
                    )
            if response.status_code == 429:
                raise ProviderUnavailable("upstream_rate_limited")
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
                raise ProviderUnavailable()
            return CachedRows(rows, datetime.now(UTC), monotonic() + spec.ttl)
        except (httpx.TimeoutException, TimeoutError) as exc:
            raise ProviderUnavailable("rdw_timeout") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderUnavailable() from exc
