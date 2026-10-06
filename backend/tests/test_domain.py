import asyncio
from datetime import UTC, datetime

import httpx
import pytest
from pydantic import ValidationError

from app.core.plates import normalize_plate
from app.providers.rdw import ProviderUnavailable, RdwProvider, VehicleNotFound, normalize_vehicle
from app.services.costs import CostAssumptions, calculate_costs
from app.services.vehicles import VehicleService


@pytest.mark.parametrize("value", ["AB-123-C", "AB123C", "ab123c", "AB 123 C"])
def test_plate_normalization(value):
    assert normalize_plate(value) == "AB123C"


@pytest.mark.parametrize("value", ["", "AB!23C", "123456", "ABCDEF", "AB'23C"])
def test_plate_validation(value):
    with pytest.raises(ValueError):
        normalize_plate(value)


def test_missing_values_are_not_zero():
    vehicle = normalize_vehicle({"kenteken": "AB123C", "merk": "TEST"}, [], datetime.now(UTC))
    assert vehicle.power_kw is None
    assert vehicle.is_import is None
    assert vehicle.mass_kg is None
    assert "powerKw" in vehicle.source.missing_fields


def test_official_and_derived_values():
    raw = {
        "kenteken": "AB123C",
        "merk": "TEST",
        "massa_rijklaar": "1400",
        "toegestane_maximum_massa_voertuig": "1900",
        "datum_eerste_toelating": "20200101",
        "datum_eerste_tenaamstelling_in_nederland": "20210301",
    }
    fuels = [
        {
            "brandstof_omschrijving": "Benzine",
            "nettomaximumvermogen": "110",
            "emissie_co2_gecombineerd_wltp": "129",
        }
    ]
    vehicle = normalize_vehicle(raw, fuels, datetime.now(UTC))
    assert vehicle.power_hp == 150
    assert vehicle.payload_kg == 500
    assert vehicle.emissions_co2 == 129
    assert vehicle.is_import is True
    assert set(vehicle.source.derived_fields) == {"powerHp", "payloadKg", "isImport"}


def test_electric_units_and_zero():
    vehicle = normalize_vehicle(
        {"kenteken": "AB123C", "merk": "TEST"},
        [
            {
                "brandstof_omschrijving": "Elektriciteit",
                "netto_max_vermogen_elektrisch": "150",
                "elektrisch_verbruik_enkel_elektrisch_wltp": "180",
                "co2_uitstoot_gecombineerd": "0",
            }
        ],
        datetime.now(UTC),
    )
    assert vehicle.power_kw == 150
    assert vehicle.electric_consumption == 18


def test_cost_scenario_and_zero():
    values = CostAssumptions(
        annual_km=12000,
        consumption=6,
        energy_price=2,
        insurance_monthly=60,
        maintenance_monthly=40,
        road_tax_monthly=50,
    )
    result = calculate_costs(values)
    assert result.energy_monthly == 120
    assert result.monthly == 270
    assert result.annual == 3240
    assert calculate_costs(values.model_copy(update={"annual_km": 0})).monthly == 150


@pytest.mark.parametrize("value", [-1, float("inf"), float("nan"), 200001])
def test_cost_invalid_inputs(value):
    with pytest.raises(ValidationError):
        CostAssumptions(
            annual_km=value,
            consumption=6,
            energy_price=2,
            insurance_monthly=60,
            maintenance_monthly=40,
            road_tax_monthly=50,
        )


async def test_provider_not_found():
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json=[]))
    ) as client:
        with pytest.raises(VehicleNotFound):
            await RdwProvider(client).get_vehicle("AB123C")


async def test_provider_partial_failure():
    def handler(request):
        if "8ys7" in str(request.url):
            return httpx.Response(503)
        return httpx.Response(200, json=[{"kenteken": "AB123C", "merk": "TEST"}])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        vehicle = await RdwProvider(client).get_vehicle("AB123C")
        assert vehicle.make == "TEST"
        assert vehicle.source.datasets == ["m9d7-ebf2"]
        assert vehicle.source.warnings


@pytest.mark.parametrize("body", [{"invalid": "response"}, [{"kenteken": "OTHER", "merk": "TEST"}]])
async def test_provider_malformed_response(body):
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json=body))
    ) as client:
        with pytest.raises(ProviderUnavailable):
            await RdwProvider(client).get_vehicle("AB123C")


async def test_cache_coalesces_requests_and_expires():
    class FakeProvider:
        calls = 0

        async def get_vehicle(self, plate):
            self.calls += 1
            await asyncio.sleep(0.01)
            return normalize_vehicle({"kenteken": plate, "merk": "TEST"}, [], datetime.now(UTC))

    provider = FakeProvider()
    service = VehicleService(provider, ttl=1)
    await asyncio.gather(*[service.get_vehicle("AB123C") for _ in range(5)])
    assert provider.calls == 1
    await service.get_vehicle("AB123C")
    assert provider.calls == 1
    service.cache["AB123C"] = (datetime(2000, 1, 1, tzinfo=UTC), service.cache["AB123C"][1])
    await service.get_vehicle("AB123C")
    assert provider.calls == 2
