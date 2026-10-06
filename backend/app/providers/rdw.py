import asyncio
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.schemas.vehicle import SourceInfo, Vehicle


class VehicleNotFound(Exception):
    pass


class ProviderUnavailable(Exception):
    pass


class VehicleProvider(Protocol):
    async def get_vehicle(self, plate: str) -> Vehicle: ...


def number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        result = float(str(value).replace(",", "."))
        return result if result >= 0 and result != float("inf") else None
    except (ValueError, TypeError):
        return None


def integer(value: Any) -> int | None:
    parsed = number(value)
    return int(parsed) if parsed is not None else None


def source_date(value: Any) -> str | None:
    try:
        return datetime.strptime(str(value), "%Y%m%d").replace(tzinfo=UTC).date().isoformat()
    except ValueError:
        return None


def boolean(value: Any) -> bool | None:
    return {"Ja": True, "Nee": False}.get(value)


def normalize_vehicle(
    raw: dict[str, Any],
    fuels: list[dict[str, Any]],
    fetched_at: datetime,
    fuel_available: bool = True,
) -> Vehicle:
    fuel = next(
        (item for item in fuels if item.get("brandstof_omschrijving") != "Elektriciteit"), {}
    )
    electric = next(
        (item for item in fuels if item.get("brandstof_omschrijving") == "Elektriciteit"), {}
    )
    power = number(fuel.get("nettomaximumvermogen"))
    electric_power = number(
        electric.get("netto_max_vermogen_elektrisch") or electric.get("nettomaximumvermogen")
    )
    if power is None:
        power = electric_power
    first = source_date(raw.get("datum_eerste_toelating"))
    local = source_date(raw.get("datum_eerste_tenaamstelling_in_nederland"))
    ready = integer(raw.get("massa_rijklaar"))
    maximum = integer(raw.get("toegestane_maximum_massa_voertuig"))
    electric_wh_per_km = number(electric.get("elektrisch_verbruik_enkel_elektrisch_wltp"))
    vehicle = Vehicle(
        license_plate=raw["kenteken"],
        make=raw["merk"],
        model=raw.get("handelsbenaming"),
        vehicle_type=raw.get("voertuigsoort"),
        body_type=raw.get("inrichting"),
        first_registration_date=first,
        first_registration_netherlands_date=local,
        apk_expiry_date=source_date(raw.get("vervaldatum_apk")),
        fuel_types=list(
            dict.fromkeys(
                f["brandstof_omschrijving"] for f in fuels if f.get("brandstof_omschrijving")
            )
        ),
        power_kw=power,
        power_hp=round(power * 1.35962) if power is not None else None,
        electric_power_kw=electric_power,
        mass_kg=integer(raw.get("massa_ledig_voertuig")),
        ready_mass_kg=ready,
        max_mass_kg=maximum,
        payload_kg=maximum - ready
        if maximum is not None and ready is not None and maximum >= ready
        else None,
        catalog_price=integer(raw.get("catalogusprijs")),
        bpm=integer(raw.get("bruto_bpm")),
        color_primary=raw.get("eerste_kleur"),
        number_of_seats=integer(raw.get("aantal_zitplaatsen")),
        number_of_doors=integer(raw.get("aantal_deuren")),
        engine_capacity_cc=integer(raw.get("cilinderinhoud")),
        cylinders=integer(raw.get("aantal_cilinders")),
        emissions_co2=number(
            fuel.get("emissie_co2_gecombineerd_wltp") or fuel.get("co2_uitstoot_gecombineerd")
        ),
        emission_class=fuel.get("uitlaatemissieniveau")
        or fuel.get("emissiecode_omschrijving")
        or electric.get("emissiecode_omschrijving"),
        consumption_combined=number(fuel.get("brandstofverbruik_gecombineerd")),
        electric_consumption=electric_wh_per_km / 10 if electric_wh_per_km is not None else None,
        length_cm=integer(raw.get("lengte")),
        width_cm=integer(raw.get("breedte")),
        height_cm=integer(raw.get("hoogte_voertuig")),
        wheelbase_cm=integer(raw.get("wielbasis")),
        towing_braked_kg=integer(raw.get("maximum_trekken_massa_geremd")),
        towing_unbraked_kg=integer(raw.get("maximum_massa_trekken_ongeremd")),
        max_speed_kmh=integer(raw.get("maximale_constructiesnelheid")),
        is_import=local > first if first and local else None,
        is_exported=boolean(raw.get("export_indicator")),
        is_taxi=boolean(raw.get("taxi_indicator")),
        recall_pending=boolean(raw.get("openstaande_terugroepactie_indicator")),
        registration_possible=boolean(raw.get("tenaamstellen_mogelijk")),
        source=SourceInfo(
            datasets=["m9d7-ebf2"] + (["8ys7-d773"] if fuel_available else []),
            fetched_at=fetched_at,
        ),
    )
    vehicle.source.missing_fields = [
        field
        for field in [
            "model",
            "firstRegistrationDate",
            "apkExpiryDate",
            "powerKw",
            "massKg",
            "emissionsCo2",
            "catalogPrice",
            "consumptionCombined",
        ]
        if vehicle.model_dump(by_alias=True).get(field) is None
    ]
    if not vehicle.fuel_types:
        vehicle.source.missing_fields.append("fuelTypes")
    vehicle.source.derived_fields = [
        field
        for field in ["powerHp", "payloadKg", "isImport"]
        if vehicle.model_dump(by_alias=True).get(field) is not None
    ]
    if not fuel_available:
        vehicle.source.warnings.append("Brandstofgegevens zijn tijdelijk niet beschikbaar.")
    return vehicle


class RdwProvider:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _dataset(self, dataset: str, plate: str) -> list[dict[str, Any]]:
        try:
            response = await self.client.get(
                f"https://opendata.rdw.nl/resource/{dataset}.json",
                params={"kenteken": plate, "$limit": "10"},
            )
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, list) or not all(isinstance(item, dict) for item in result):
                raise ProviderUnavailable()
            return result
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderUnavailable() from exc

    async def get_vehicle(self, plate: str) -> Vehicle:
        results: tuple[
            list[dict[str, Any]] | BaseException, list[dict[str, Any]] | BaseException
        ] = await asyncio.gather(
            self._dataset("m9d7-ebf2", plate),
            self._dataset("8ys7-d773", plate),
            return_exceptions=True,
        )
        raw_result = results[0]
        fuel_result = results[1]
        if isinstance(raw_result, BaseException):
            raise ProviderUnavailable() from raw_result
        if not raw_result:
            raise VehicleNotFound()
        if raw_result[0].get("kenteken") != plate or not raw_result[0].get("merk"):
            raise ProviderUnavailable()
        fuel_available = not isinstance(fuel_result, BaseException)
        fuels = fuel_result if isinstance(fuel_result, list) else []
        try:
            return normalize_vehicle(raw_result[0], fuels, datetime.now(UTC), fuel_available)
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderUnavailable() from exc
