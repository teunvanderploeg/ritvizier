import asyncio
import copy
import json
from datetime import UTC, date, datetime
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import settings
from app.core.rdw_values import boolean, integer, number, source_date
from app.main import app, requests
from app.providers.rdw import RdwProvider, VehicleNotFound, normalize_vehicle
from app.providers.rdw_client import RdwClient
from app.schemas.vehicle import ApkHistory, Inspection, InspectionDefect, SectionSource
from app.services.analysis import analyze_vehicle
from app.services.apk_history import normalize_history
from app.services.vehicles import VehicleService

BASE = json.loads((Path(__file__).parent / "fixtures/rdw-mini.json").read_text(encoding="utf-8"))


def notification(when="20231013", time="933", code="AL"):
    return {
        "kenteken": "G921GS",
        "meld_datum_door_keuringsinstantie": when,
        "meld_tijd_door_keuringsinstantie": time,
        "soort_erkenning_keuringsinstantie": code,
        "soort_erkenning_omschrijving": "APK Lichte voertuigen"
        if code == "AL"
        else "Gasinstallatie",
    }


def observed(code="310", count="2", **kwargs):
    return {
        **notification(**kwargs),
        "gebrek_identificatie": code,
        "aantal_gebreken_geconstateerd": count,
    }


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("20261007", "2026-10-07"),
        (20261007, "2026-10-07"),
        ("2026-10-07T09:33:00.000", "2026-10-07"),
        ("20260230", None),
        (None, None),
    ],
)
def test_source_date_formats(raw, expected):
    assert source_date(raw) == expected


def test_unknown_indicators_and_invalid_numbers_stay_unknown():
    assert boolean("Geen verstrekking in Open Data") is None
    assert boolean("J") is True and boolean("N") is False
    assert integer("1.5") is None
    assert number("NaN") is None and number("inf") is None
    assert number("0") == 0


def test_official_payload_wins_without_required_mass_fields():
    vehicle = normalize_vehicle(
        {"kenteken": "G921GS", "merk": "MINI", "laadvermogen": "640"}, [], datetime.now(UTC)
    )
    assert vehicle.payload_kg == 640 and not vehicle.payload_derived
    assert "payloadKg" not in vehicle.source.derived_fields


def test_history_keeps_real_notifications_and_defect_only_events_separate():
    references = [
        {
            "gebrek_identificatie": "310",
            "ingangsdatum_gebrek": "20170401",
            "gebrek_omschrijving": "Remslang schuurt langs enig deel",
        }
    ]
    history = normalize_history(
        "G921GS",
        [notification("20251015"), notification(), notification(code="GL")],
        [observed(), observed(), observed(when="20221013")],
        references,
        True,
        True,
        True,
    )
    assert len(history.inspections) == 3
    assert history.inspections[0].date == "2025-10-15"
    assert history.inspections[0].has_notification and not history.inspections[0].defects
    assert history.inspections[1].defects[0].count == 2
    assert history.inspections[1].defects[0].description == references[0]["gebrek_omschrijving"]
    assert not history.inspections[2].has_notification
    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.apk_history = history
    result = analyze_vehicle(vehicle, date(2026, 10, 7))
    assert result.inspection_count == 2 and result.defect_count == 4
    assert any(w.code == "REPEATED_APK_DEFECT" for w in result.warnings)


def test_history_joins_time_and_date_and_uses_the_description_valid_at_that_date():
    references = [
        {
            "gebrek_identificatie": "310",
            "ingangsdatum_gebrek": "20170401",
            "einddatum_gebrek": "20240101",
            "gebrek_omschrijving": "Oude officiële omschrijving",
        },
        {
            "gebrek_identificatie": "310",
            "ingangsdatum_gebrek": "20240101",
            "gebrek_omschrijving": "Nieuwe officiële omschrijving",
        },
    ]
    history = normalize_history(
        "G921GS",
        [notification(), notification(time="1100")],
        [observed(time="1100")],
        references,
        True,
        True,
        True,
    )
    assert len(history.inspections) == 2
    assert history.inspections[0].time == "11:00" and history.inspections[0].defects
    assert history.inspections[1].time == "09:33" and not history.inspections[1].defects
    assert history.inspections[0].defects[0].description == "Oude officiële omschrijving"


def test_invalid_dates_unknown_codes_and_partial_history_do_not_fabricate_data():
    history = normalize_history(
        "G921GS",
        [notification("20260230")],
        [observed(code="UNKNOWN", count=None)],
        [],
        False,
        True,
        False,
    )
    assert len(history.inspections) == 1
    assert not history.inspections[0].has_notification
    assert history.inspections[0].defects[0].description is None
    assert history.inspections[0].defects[0].count is None
    assert not history.notifications_available and not history.descriptions_available


def test_conflicting_duplicate_defect_counts_remain_unknown():
    history = normalize_history(
        "G921GS",
        [notification()],
        [observed(count="2"), observed(count="3")],
        [],
        True,
        True,
        False,
    )
    assert len(history.inspections[0].defects) == 1
    assert history.inspections[0].defects[0].count is None
    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.apk_history = history
    assert not analyze_vehicle(vehicle).defect_count_complete


def test_datetime_fallback_matches_a_notification_with_numeric_time():
    record = observed()
    del record["meld_datum_door_keuringsinstantie"]
    del record["meld_tijd_door_keuringsinstantie"]
    record["meld_datum_door_keuringsinstantie_dt"] = "2023-10-13T09:33:00.000"
    history = normalize_history("G921GS", [notification()], [record], [], True, True, False)
    assert len(history.inspections) == 1 and history.inspections[0].has_notification
    assert history.inspections[0].defects[0].code == "310"


@pytest.mark.parametrize(
    ("days", "status"),
    [(-1, "expired"), (0, "urgent"), (30, "urgent"), (31, "soon"), (60, "soon"), (61, "valid")],
)
def test_analysis_apk_boundaries(days, status):
    from datetime import timedelta

    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.apk_expiry_date = (date(2026, 10, 7) + timedelta(days=days)).isoformat()
    result = analyze_vehicle(vehicle, date(2026, 10, 7))
    assert result.apk_status == status and result.apk_days_remaining == days


def test_analysis_warning_codes_and_neutral_claims():
    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.apk_expiry_date = "2026-10-06"
    vehicle.odometer_judgment = "Onlogisch"
    vehicle.is_import = True
    vehicle.recall_pending = True
    vehicle.registration_possible = False
    vehicle.is_exported = True
    vehicle.waiting_for_inspection = True
    vehicle.registration_date = "2026-10-05"
    result = analyze_vehicle(vehicle, date(2026, 10, 7))
    assert {w.code for w in result.warnings} == {
        "APK_EXPIRED",
        "MILEAGE_JUDGEMENT_ILLOGICAL",
        "LIKELY_IMPORTED",
        "OPEN_RECALL",
        "NOT_TRANSFERABLE",
        "EXPORTED",
        "WAITING_FOR_INSPECTION",
        "RECENT_REGISTRATION_CHANGE",
    }
    assert all(w.severity != "critical" for w in result.warnings)
    assert result.age_months == 83 and result.registration_duration_days == 2
    assert result.import_age_days == 0


@pytest.mark.parametrize("judgment", ["Geen oordeel", "Niet geregistreerd"])
def test_no_judgment_is_explained_without_a_mileage_value(judgment):
    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.odometer_judgment = judgment
    assert any(w.code == "MILEAGE_NO_JUDGEMENT" for w in analyze_vehicle(vehicle).warnings)
    assert "mileage" not in vehicle.model_dump()


def test_analysis_does_not_repeat_two_defects_from_one_date_or_infer_owners():
    vehicle = normalize_vehicle(BASE["m9d7-ebf2"][0], [], datetime.now(UTC))
    vehicle.apk_history = ApkHistory(
        inspections=[
            Inspection(
                key="one",
                date="2023-10-13",
                has_notification=True,
                defects=[
                    InspectionDefect(code="A", category="remmen", count=2),
                    InspectionDefect(code="B", category="remmen", count=1),
                ],
            )
        ]
    )
    result = analyze_vehicle(vehicle)
    assert result.defect_count == 3
    assert not any(w.code == "REPEATED_APK_DEFECT" for w in result.warnings)
    assert "owners" not in vehicle.model_dump()


async def test_missing_main_record_does_not_query_extra_sources():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, json=[])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(VehicleNotFound):
            await RdwProvider(client).get_vehicle("G921GS")
    assert calls == ["/resource/m9d7-ebf2.json"]


async def test_multifuel_multibody_classes_axles_and_partial_optional_failure():
    records = copy.deepcopy(BASE)
    records["8ys7-d773"] = [
        {
            "kenteken": "G921GS",
            "brandstof_volgnummer": "1",
            "brandstof_omschrijving": "Benzine",
            "nettomaximumvermogen": "110",
            "emis_co2_gewogen_gecombineerd_wltp": "30",
        },
        {
            "kenteken": "G921GS",
            "brandstof_volgnummer": "2",
            "brandstof_omschrijving": "Elektriciteit",
            "netto_max_vermogen_elektrisch": "70",
            "nominaal_continu_maximumvermogen": "45",
        },
    ]
    records["vezc-m2t6"] += [
        {
            "kenteken": "G921GS",
            "carrosserie_volgnummer": "2",
            "carrosserietype": "TEST",
            "type_carrosserie_europese_omschrijving": "Tweede testcarrosserie",
        }
    ]
    records["kmfi-hrps"] = [
        {"kenteken": "G921GS", "voertuigklasse": "I", "voertuigklasse_omschrijving": "Testklasse"}
    ]
    records["3huj-srit"][0]["aangedreven_as"] = "J"

    def handler(request):
        ds = request.url.path.split("/")[-1][:-5]
        return (
            httpx.Response(503)
            if ds == "jhie-znh9"
            else httpx.Response(200, json=records.get(ds, []))
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        vehicle = await RdwProvider(client).get_vehicle("g-921-gs")
    assert len(vehicle.fuels) == 2 and len(vehicle.bodies) == 2 and len(vehicle.axes) == 2
    assert vehicle.fuels[0].power_hp == 150
    assert vehicle.fuels[1].continuous_power_kw == 45
    assert vehicle.emissions_co2_weighted_wltp == 30
    assert vehicle.body_code is None and vehicle.vehicle_classes[0].description == "Testklasse"
    assert vehicle.axes[0].driven is True
    assert vehicle.source.partial and "bodySpecifications" in vehicle.source.unavailable_sections
    assert vehicle.source.sections["fuel"].record_count == 2


async def test_possible_model_recalls_never_set_plate_indicator_or_warning():
    records = copy.deepcopy(BASE)
    records["mu2x-mu5e"] = [
        {"merk": "MINI", "type": "COUNTRYMAN", "referentiecode_rdw": "TEST-POSSIBLE"},
        {"merk": "MINI", "type": "COOPER", "referentiecode_rdw": "TEST-WRONG-MODEL"},
    ]

    def handler(request):
        ds = request.url.path.split("/")[-1][:-5]
        if ds == "j9yg-7rg9":
            ref = request.url.params["referentiecode_rdw"]
            return httpx.Response(
                200, json=[{"referentiecode_rdw": ref, "omschrijving_defect": "Testcontext"}]
            )
        return httpx.Response(200, json=records.get(ds, []))

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        vehicle = await RdwProvider(client).get_vehicle("G921GS")
    assert [r.reference for r in vehicle.possible_recalls] == ["TEST-POSSIBLE"]
    assert vehicle.recall_pending is False and vehicle.recalls == []
    assert not any(w.code == "OPEN_RECALL" for w in vehicle.analysis.warnings)


async def test_reference_cache_coalesces_calls_and_keeps_token_server_side(monkeypatch):
    monkeypatch.setattr(settings, "rdw_app_token", SecretStr("test-only-token"))
    calls = []

    async def handler(request):
        calls.append(request)
        await asyncio.sleep(0.005)
        return httpx.Response(200, json=[{"gebrek_identificatie": "310"}])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        data = RdwClient(client)
        await asyncio.gather(*(data.query("hx2c-gt7k", {}) for _ in range(5)))
        await data.query("hx2c-gt7k", {})
        assert len(calls) == 1
        assert calls[0].headers["X-App-Token"] == "test-only-token"
        assert "token" not in str(calls[0].url)
        with pytest.raises(ValueError):
            await data.query("hx2c-gt7k", {"$where": "anything"})
        with pytest.raises(ValueError):
            await data.query("unknown-dataset", {})


async def test_empty_optional_token_does_not_send_an_auth_header(monkeypatch):
    monkeypatch.setattr(settings, "rdw_app_token", SecretStr(""))
    sent = []

    def handler(request):
        sent.append(request)
        return httpx.Response(200, json=[])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await RdwClient(client).query("m9d7-ebf2", {"kenteken": "G921GS"})
    assert "X-App-Token" not in sent[0].headers


async def test_aggregate_cache_does_not_extend_expired_source_data():
    from datetime import timedelta

    class FakeProvider:
        calls = 0

        async def get_vehicle(self, plate):
            self.calls += 1
            vehicle = normalize_vehicle({"kenteken": plate, "merk": "TEST"}, [], datetime.now(UTC))
            vehicle.source.sections["registration"] = SectionSource(
                datasets=["m9d7-ebf2"],
                fetched_at=datetime.now(UTC) - timedelta(days=2),
                record_count=1,
            )
            return vehicle

    provider = FakeProvider()
    service = VehicleService(provider)
    await service.get_vehicle("G921GS")
    await service.get_vehicle("G921GS")
    assert provider.calls == 2


@pytest.mark.parametrize(
    ("kind", "expected"), [("rate", 429), ("timeout", 504), ("unavailable", 502)]
)
def test_primary_upstream_errors_have_distinct_codes(kind, expected):
    def handler(request):
        if kind == "timeout":
            raise httpx.ReadTimeout("test timeout", request=request)
        return httpx.Response(429 if kind == "rate" else 503)

    requests.clear()
    with TestClient(app) as browser:
        app.state.vehicle_service = VehicleService(
            RdwProvider(httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        )
        response = browser.get("/api/vehicles/G-921-GS")
    assert response.status_code == expected
    assert (
        response.json()["code"]
        == {
            "rate": "upstream_rate_limited",
            "timeout": "rdw_timeout",
            "unavailable": "rdw_unavailable",
        }[kind]
    )
    if kind == "rate":
        assert response.headers["Retry-After"] == "60"
    requests.clear()
