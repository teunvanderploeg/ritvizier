"""Passenger-car MRB using a versioned snapshot of the official calculator.

Tables already include provincial opcenten and whole-euro quarterly rounding.
From July 2026 their weight brackets refer to massa rijklaar, not empty mass.
"""

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Literal
from zoneinfo import ZoneInfo

from pydantic import Field

from app.schemas.vehicle import ApiModel, Vehicle

Province = Literal["DR", "FL", "FR", "GL", "GR", "LI", "NB", "NH", "OV", "UT", "ZL", "ZH"]
RATES: dict[str, Any] = json.loads(
    (Path(__file__).resolve().parents[1] / "data" / "road_tax_2026.json").read_text(
        encoding="utf-8"
    )
)


class RoadTaxRequest(ApiModel):
    license_plate: str
    province: Province
    particulate_surcharge: bool | None = None
    gas_installation: Literal["G3", "other"] | None = None


class RoadTaxEstimate(ApiModel):
    available: bool = False
    reason: str | None = None
    province: Province
    province_name: str
    quarterly: int | None = None
    monthly: float | None = None
    annual: int | None = None
    weight_kg: int | None = None
    weight_basis: str = "Massa rijklaar"
    weight_class: str | None = None
    fuel: str | None = None
    needs_particulate_choice: bool = False
    needs_gas_choice: bool = False
    particulate_surcharge: bool | None = None
    year: int = 2026
    valid_through: str = RATES["validThrough"]
    checked_at: str = RATES["checkedAt"]
    source_url: str = RATES["sourceUrl"]
    notes: list[str] = Field(
        default_factory=lambda: [
            "Normaal tarief voor een particulier. Bijzondere tarieven, schorsing en persoonlijke vrijstellingen zijn niet meegerekend."
        ]
    )


def calculate_road_tax(
    vehicle: Vehicle, values: RoadTaxRequest, today: date | None = None
) -> RoadTaxEstimate:
    current = today or datetime.now(ZoneInfo("Europe/Amsterdam")).date()
    result = RoadTaxEstimate(
        province=values.province,
        province_name=RATES["provinces"][values.province],
        weight_kg=vehicle.ready_mass_kg,
    )
    if (
        not date.fromisoformat(RATES["validFrom"])
        <= current
        <= date.fromisoformat(RATES["validThrough"])
    ):
        result.reason = (
            "Voor deze datum zijn nog geen gecontroleerde belastingtarieven beschikbaar."
        )
        return result
    if (
        vehicle.vehicle_type != "Personenauto"
        or vehicle.body_type in {"kampeerwagen", "kampeerauto"}
        or vehicle.is_taxi
    ):
        result.reason = "Voor dit voertuig kan een ander tarief gelden. Gebruik de rekenhulp van de Belastingdienst."
        return result
    if (
        vehicle.first_registration_date
        and current.year - int(vehicle.first_registration_date[:4]) >= 40
    ):
        result.reason = "Deze auto kan onder de oldtimerregeling vallen. Controleer de vrijstelling bij de Belastingdienst."
        return result
    weight = vehicle.ready_mass_kg
    if not weight or weight < 1:
        result.reason = "De RDW geeft geen massa rijklaar door; een betrouwbaar bedrag kan niet worden berekend."
        return result
    fuels = set(vehicle.fuel_types)
    combustion = fuels - {"Elektriciteit"}
    fine = False
    if fuels and fuels <= {"Elektriciteit", "Waterstof"}:
        column, result.fuel = 1, "Volledig elektrisch / waterstof"
    elif combustion == {"Benzine"}:
        column, result.fuel = 1, "Benzine (ook hybride)"
    elif combustion == {"Diesel"}:
        column, result.fuel = 2, "Diesel (ook hybride)"
        # No inference from Euro class alone: the calculator asks about the surcharge explicitly.
        if values.particulate_surcharge is None:
            result.needs_particulate_choice = True
            result.reason = "Geef aan of voor deze diesel fijnstoftoeslag geldt."
            return result
        fine = values.particulate_surcharge
        result.particulate_surcharge = fine
    elif (
        combustion
        and combustion <= {"CNG", "LNG", "Aardgas", "Benzine"}
        and combustion != {"Benzine"}
    ):
        column, result.fuel = 4, "Aardgas"
    elif "LPG" in combustion and combustion <= {"LPG", "Benzine"}:
        if values.gas_installation is None:
            result.needs_gas_choice = True
            result.reason = "Kies de geregistreerde gasinstallatie om het LPG-tarief te bepalen."
            return result
        column = 4 if values.gas_installation == "G3" else 5
        result.fuel = "LPG G3" if column == 4 else "LPG (overig)"
    else:
        result.reason = (
            "Voor deze brandstofcombinatie kan het tarief niet automatisch worden vastgesteld."
        )
        return result
    table: list[list[int]] = RATES["tables"][values.province]["particulate" if fine else "standard"]
    if weight > table[-1][0] + 99:
        result.reason = "Het voertuig valt buiten de gecontroleerde gewichtstabel."
        return result
    index = max(i for i, row in enumerate(table) if row[0] <= weight)
    row = table[index]
    upper = table[index + 1][0] - 1 if index + 1 < len(table) else row[0] + 99
    quarterly = row[1 if fine else column]
    if fuels <= {"Elektriciteit", "Waterstof"}:
        # Current calculator: 70% of petrol rounded down; ignore the legacy EV column.
        quarterly = quarterly * 7 // 10
    result.available = True
    result.quarterly = quarterly
    result.monthly = round(quarterly / 3, 2)
    result.annual = quarterly * 4
    result.weight_class = f"{row[0]}–{upper} kg"
    return result
