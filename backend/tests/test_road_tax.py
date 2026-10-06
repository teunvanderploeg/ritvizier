import json
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.vehicle import Vehicle
from app.services.road_tax import RoadTaxRequest, calculate_road_tax

MINI = Vehicle.model_validate(
    json.loads((Path(__file__).parent / "fixtures" / "vehicles.json").read_text(encoding="utf-8"))[
        "G921GS"
    ]
)
TODAY = date(2026, 10, 7)


@pytest.mark.parametrize(
    ("province", "quarterly"),
    [
        ("DR", 235),
        ("FL", 228),
        ("FR", 235),
        ("GL", 241),
        ("GR", 239),
        ("LI", 232),
        ("NB", 231),
        ("NH", 226),
        ("OV", 226),
        ("UT", 230),
        ("ZL", 228),
        ("ZH", 247),
    ],
)
def test_mini_all_provinces_official_table(province, quarterly):
    result = calculate_road_tax(
        MINI, RoadTaxRequest(license_plate="G921GS", province=province), TODAY
    )
    assert result.available and result.quarterly == quarterly
    assert result.annual == quarterly * 4
    assert result.weight_kg == 1490 and result.weight_class == "1451–1550 kg"


@pytest.mark.parametrize(
    ("weight", "quarterly"), [(1450, 199), (1451, 226), (1550, 226), (1551, 253)]
)
def test_ready_mass_bracket_boundaries(weight, quarterly):
    result = calculate_road_tax(
        MINI.model_copy(update={"ready_mass_kg": weight}),
        RoadTaxRequest(license_plate="G921GS", province="NH"),
        TODAY,
    )
    assert result.quarterly == quarterly


def test_ev_uses_current_calculator_floor_not_legacy_ev_column():
    ev = MINI.model_copy(update={"fuel_types": ["Elektriciteit"]})
    result = calculate_road_tax(ev, RoadTaxRequest(license_plate="G921GS", province="GL"), TODAY)
    assert result.quarterly == 168  # floor(241 * .70); legacy table column gives 169.
    hybrid = MINI.model_copy(update={"fuel_types": ["Benzine", "Elektriciteit"]})
    assert (
        calculate_road_tax(
            hybrid, RoadTaxRequest(license_plate="G921GS", province="GL"), TODAY
        ).quarterly
        == 241
    )


def test_diesel_requires_surcharge_choice_and_gas_requires_installation():
    request = RoadTaxRequest(license_plate="G921GS", province="NH")
    diesel = MINI.model_copy(update={"fuel_types": ["Diesel"]})
    assert calculate_road_tax(diesel, request, TODAY).needs_particulate_choice
    normal = calculate_road_tax(
        diesel, request.model_copy(update={"particulate_surcharge": False}), TODAY
    )
    fine = calculate_road_tax(
        diesel, request.model_copy(update={"particulate_surcharge": True}), TODAY
    )
    assert normal.quarterly == 462 and fine.quarterly > normal.quarterly
    gas = MINI.model_copy(update={"fuel_types": ["Benzine", "LPG"]})
    assert calculate_road_tax(gas, request, TODAY).needs_gas_choice
    assert (
        calculate_road_tax(
            gas, request.model_copy(update={"gas_installation": "G3"}), TODAY
        ).quarterly
        == 340
    )


def test_unavailable_inputs_and_expired_rates_never_turn_into_zero_tax():
    request = RoadTaxRequest(license_plate="G921GS", province="NH")
    for update in [
        {"ready_mass_kg": None},
        {"vehicle_type": "Bedrijfsauto"},
        {"is_taxi": True},
        {"fuel_types": []},
    ]:
        result = calculate_road_tax(MINI.model_copy(update=update), request, TODAY)
        assert not result.available and result.quarterly is None and result.reason
    assert not calculate_road_tax(MINI, request, date(2027, 1, 1)).available
    assert not calculate_road_tax(MINI, request, date(2026, 6, 30)).available
    with pytest.raises(ValidationError):
        RoadTaxRequest(license_plate="G921GS", province="unknown")
