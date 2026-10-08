"""Market adverts are separate from official vehicle registration records."""

from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, Field, HttpUrl, field_validator

from app.core.plates import normalize_plate
from app.schemas.vehicle import ApiModel


class Listing(ApiModel):
    source: str = Field(min_length=1, max_length=100)
    source_id: str = Field(min_length=1, max_length=150)
    url: HttpUrl
    country: Literal["NL"] = "NL"
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=150)
    year: int | None = Field(default=None, ge=1886, le=2100)
    price: float | None = Field(default=None, gt=0, le=10000000)
    mileage: int | None = Field(default=None, ge=0, le=3000000)
    fuel: str | None = Field(default=None, max_length=100)
    transmission: str | None = Field(default=None, max_length=100)
    trim: str | None = Field(default=None, max_length=150)
    color: str | None = Field(default=None, max_length=100)
    seller: str | None = Field(default=None, max_length=150)
    seller_id: str | None = Field(default=None, max_length=150)
    stock_id: str | None = Field(default=None, max_length=150)
    location: str | None = Field(default=None, max_length=150)
    plate: str | None = Field(default=None, max_length=15)
    vin: str | None = Field(default=None, min_length=17, max_length=17)
    photo_hash: str | None = Field(default=None, min_length=64, max_length=64)
    observed_at: AwareDatetime

    @field_validator("url")
    @classmethod
    def secure_url(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https" or value.username or value.password:
            raise ValueError("Listing links must use HTTPS without credentials")
        return value

    @field_validator("photo_hash")
    @classmethod
    def hash_format(cls, value: str | None) -> str | None:
        if value and any(char not in "0123456789abcdef" for char in value.lower()):
            raise ValueError("photoHash must be SHA-256 hex")
        return value.lower() if value else None

    @field_validator("plate")
    @classmethod
    def valid_plate(cls, value: str | None) -> str | None:
        return normalize_plate(value) if value else None

    @field_validator("vin")
    @classmethod
    def valid_vin(cls, value: str | None) -> str | None:
        if value and any(char not in "ABCDEFGHJKLMNPRSTUVWXYZ0123456789" for char in value.upper()):
            raise ValueError("Invalid VIN")
        return value.upper() if value else None


class ListingFeed(ApiModel):
    updated_at: AwareDatetime
    listings: list[Listing] = Field(max_length=10000)


class ListingQuery(ApiModel):
    make: str = Field(default="", max_length=100)
    model: str = Field(default="", max_length=150)
    fuel: str = Field(default="", max_length=100)
    transmission: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=150)
    year_min: int | None = Field(default=None, ge=1886, le=2100)
    year_max: int | None = Field(default=None, ge=1886, le=2100)
    price_max: float | None = Field(default=None, gt=0, le=10000000)
    mileage_max: int | None = Field(default=None, ge=0, le=3000000)
    page: int = Field(default=1, ge=1, le=1000)
    sort: Literal["recent", "price"] = "recent"


class ListingGroup(ApiModel):
    id: str
    listing: Listing
    offers: list[Listing]
    match_reasons: list[str]


class ListingResults(ApiModel):
    available: bool
    reason: str | None = None
    updated_at: datetime | None = None
    groups: list[ListingGroup] = Field(default_factory=list)
    total: int = 0
    advert_count: int = 0
    page: int = 1
    page_size: int = 24
    warnings: list[str] = Field(default_factory=list)
