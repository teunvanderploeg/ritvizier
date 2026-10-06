from pydantic import Field

from app.schemas.vehicle import ApiModel


class CostAssumptions(ApiModel):
    annual_km: float = Field(ge=0, le=200000)
    consumption: float = Field(ge=0, le=200)
    energy_price: float = Field(ge=0, le=20)
    insurance_monthly: float = Field(ge=0, le=2000)
    maintenance_monthly: float = Field(ge=0, le=2000)
    road_tax_monthly: float = Field(ge=0, le=2000)


class CostEstimate(ApiModel):
    energy_monthly: float
    insurance_monthly: float
    maintenance_monthly: float
    road_tax_monthly: float
    monthly: float
    annual: float
    label: str = "Berekend door RitVizier op basis van je invoer"


def calculate_costs(values: CostAssumptions) -> CostEstimate:
    energy = round(values.annual_km / 100 * values.consumption * values.energy_price / 12, 2)
    monthly = round(
        energy + values.insurance_monthly + values.maintenance_monthly + values.road_tax_monthly, 2
    )
    return CostEstimate(
        energy_monthly=energy,
        insurance_monthly=values.insurance_monthly,
        maintenance_monthly=values.maintenance_monthly,
        road_tax_monthly=values.road_tax_monthly,
        monthly=monthly,
        annual=round(monthly * 12, 2),
    )
