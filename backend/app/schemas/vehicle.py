from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SourceInfo(ApiModel):
    name: str = "RDW Open Data"
    datasets: list[str]
    fetched_at: datetime
    missing_fields: list[str] = Field(default_factory=list)
    derived_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


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
