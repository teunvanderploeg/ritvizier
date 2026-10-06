from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, allow_inf_nan=False)


class SourceInfo(ApiModel):
    name: str = "RDW Open Data"
    datasets: list[str]
    fetched_at: datetime
    missing_fields: list[str] = Field(default_factory=list)
    derived_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    schema_version: int = 2


class Recall(ApiModel):
    reference: str
    status_code: str | None = None
    status: str | None = None
    publication_date: str | None = None
    producer: str | None = None
    producer_reference: str | None = None
    defect: str | None = None
    consequences: str | None = None
    remedy: str | None = None
    risks: list[str] = Field(default_factory=list)
    url: str | None = None
    phone: str | None = None


class Axle(ApiModel):
    number: int | None = None
    position: str | None = None
    track_cm: int | None = None
    max_mass_kg: int | None = None


class TypeApproval(ApiModel):
    matched: bool = False
    transmission_code: str | None = None
    transmission: str | None = None
    gears: int | None = None
    length_mm: int | None = None
    width_mm: int | None = None
    height_mm: int | None = None
    wheelbase_mm: int | None = None


class Vehicle(ApiModel):
    license_plate: str
    make: str
    model: str | None = None
    vehicle_type: str | None = None
    body_type: str | None = None
    first_registration_date: str | None = None
    first_registration_netherlands_date: str | None = None
    apk_expiry_date: str | None = None
    fuel_types: list[str] = Field(default_factory=list)
    power_kw: float | None = None
    power_hp: int | None = None
    electric_power_kw: float | None = None
    mass_kg: int | None = None
    ready_mass_kg: int | None = None
    max_mass_kg: int | None = None
    payload_kg: int | None = None
    catalog_price: int | None = None
    bpm: int | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    registration_date: str | None = None
    wam_insured: bool | None = None
    type_code: str | None = None
    variant: str | None = None
    version: str | None = None
    type_approval_number: str | None = None
    european_category: str | None = None
    body_code: str | None = None
    number_of_wheels: int | None = None
    standing_places: int | None = None
    technical_max_mass_kg: int | None = None
    combination_max_mass_kg: int | None = None
    coupling_max_load_kg: int | None = None
    odometer_judgment: str | None = None
    odometer_judgment_code: str | None = None
    odometer_explanation: str | None = None
    odometer_last_year: int | None = None
    recalls: list[Recall] = Field(default_factory=list)
    recall_details_available: bool = False
    axes: list[Axle] = Field(default_factory=list)
    type_approval: TypeApproval = Field(default_factory=TypeApproval)
    consumption_wltp: float | None = None
    consumption_city: float | None = None
    consumption_highway: float | None = None
    emissions_co2_wltp: float | None = None
    emissions_co2_nedc: float | None = None
    particulate_emissions_wltp: float | None = None
    particulate_emissions: float | None = None
    noise_stationary_db: float | None = None
    noise_driving_db: float | None = None
    noise_rpm: int | None = None
    environmental_approval: str | None = None
    electric_range_km: int | None = None
    hybrid_class: str | None = None
    consumption_weighted_wltp: float | None = None
    emissions_co2_weighted_wltp: float | None = None
    number_of_seats: int | None = None
    number_of_doors: int | None = None
    engine_capacity_cc: int | None = None
    cylinders: int | None = None
    emissions_co2: float | None = None
    emission_class: str | None = None
    consumption_combined: float | None = None
    electric_consumption: float | None = None
    length_cm: int | None = None
    width_cm: int | None = None
    height_cm: int | None = None
    wheelbase_cm: int | None = None
    towing_braked_kg: int | None = None
    towing_unbraked_kg: int | None = None
    max_speed_kmh: int | None = None
    is_import: bool | None = None
    is_exported: bool | None = None
    is_taxi: bool | None = None
    recall_pending: bool | None = None
    registration_possible: bool | None = None
    source: SourceInfo
