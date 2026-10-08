import json
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app, settings
from app.schemas.listings import Listing, ListingFeed, ListingQuery
from app.services.listings import group_listings, search_feed


def advert(source_id="1", **changes):
    return Listing.model_validate(
        {
            "source": "Testbron",
            "sourceId": source_id,
            "url": f"https://example.org/car/{source_id}",
            "make": "MINI",
            "model": "Countryman",
            "year": 2021,
            "price": 24000,
            "mileage": 52000,
            "observedAt": datetime.now(UTC),
            **changes,
        }
    )


def test_cross_site_plate_matches_keep_prices_and_conflicting_ids_separate():
    rows = [
        advert(plate="G-921-GS"),
        advert("2", source="Andere bron", plate="G921GS", price=23500),
        advert("3", plate="P185BH"),
    ]
    groups = group_listings(rows)
    assert sorted(len(group.offers) for group in groups) == [1, 2]
    combined = next(group for group in groups if len(group.offers) == 2)
    assert {offer.price for offer in combined.offers} == {23500, 24000}
    assert "Gelijk kenteken" in combined.match_reasons


def test_lookalikes_require_seller_and_shared_photo_and_details():
    attributes = {
        "sellerId": "dealer:123",
        "photoHash": "a" * 64,
        "trim": "Cooper",
        "color": "Groen",
        "fuel": "Benzine",
        "transmission": "Automaat",
    }
    rows = [
        advert(**attributes),
        advert("2", **attributes),
        advert("3", **{**attributes, "photoHash": None}),
        advert("4", **{**attributes, "sellerId": "dealer:456"}),
    ]
    assert sorted(len(group.offers) for group in group_listings(rows)) == [1, 1, 2]


def test_conflicting_vins_veto_plate_match():
    rows = [
        advert(plate="G921GS", vin="WVWZZZ1JZXW000001"),
        advert("2", plate="G921GS", vin="WVWZZZ1JZXW000002"),
    ]
    assert len(group_listings(rows)) == 2


def test_incomplete_advert_cannot_bridge_two_different_plates():
    common = {"sellerId": "dealer:1", "stockId": "stock:1"}
    rows = [
        advert("1", **common, plate="G921GS"),
        advert("2", **common),
        advert("3", **common, plate="P185BH"),
    ]
    assert len(group_listings(rows)) == 2


def test_search_filters_one_offer_without_losing_other_source_links(tmp_path):
    rows = [advert(plate="G921GS", price=25000), advert("2", plate="G921GS", price=22000)]
    path = tmp_path / "listings.json"
    path.write_text(
        ListingFeed(updatedAt=datetime.now(UTC), listings=rows).model_dump_json(by_alias=True)
    )
    result = search_feed(str(path), ListingQuery(price_max=23000))
    assert result.total == 1
    assert result.groups[0].listing.price == 22000
    assert len(result.groups[0].offers) == 2
    assert search_feed(str(path), ListingQuery(mileage_max=0)).total == 0


def test_feed_freshness_failures_and_missing_values(tmp_path):
    assert not search_feed(None, ListingQuery()).available
    path = tmp_path / "listings.json"
    path.write_text("invalid")
    assert not search_feed(str(path), ListingQuery()).available
    old = datetime.now(UTC) - timedelta(days=2)
    path.write_text(ListingFeed(updatedAt=old, listings=[]).model_dump_json())
    assert not search_feed(str(path), ListingQuery()).available
    rows = [advert(observedAt=old), advert("2", mileage=None)]
    path.write_text(ListingFeed(updatedAt=datetime.now(UTC), listings=rows).model_dump_json())
    result = search_feed(str(path), ListingQuery())
    assert result.total == 1 and result.warnings
    assert result.groups[0].listing.mileage is None
    assert search_feed(str(path), ListingQuery(mileage_max=50000)).total == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"url": "javascript:alert(1)"},
        {"url": "http://example.org"},
        {"plate": "onbekend"},
        {"vin": "I" * 17},
        {"observedAt": "2026-10-08"},
    ],
)
def test_invalid_identifiers_dates_and_links_rejected(changes):
    with pytest.raises(ValidationError):
        advert(**changes)


def test_listing_api_validates_filters_and_reports_missing_feed(monkeypatch):
    monkeypatch.setattr(settings, "listings_file", None)
    # No lifespan is needed; listing retrieval is independent of RDW.
    client = TestClient(app)
    assert client.get("/api/listings?year_min=2025&year_max=2020").status_code == 422
    assert client.get("/api/listings?price_max=-1").status_code == 422
    assert client.get("/api/listings").json()["available"] is False


def test_pagination_and_price_sort(tmp_path):
    rows = [advert(str(index), price=10000 + index) for index in range(30)]
    path = tmp_path / "listings.json"
    path.write_text(ListingFeed(updatedAt=datetime.now(UTC), listings=rows).model_dump_json())
    first = search_feed(str(path), ListingQuery(sort="price"))
    second = search_feed(str(path), ListingQuery(sort="price", page=2))
    assert first.total == 30 and len(first.groups) == 24 and len(second.groups) == 6
    assert first.groups[0].listing.price == 10000
    assert not ({g.id for g in first.groups} & {g.id for g in second.groups})


def test_repeated_source_record_uses_newest_observation():
    newer = advert(price=23000)
    older = newer.model_copy(
        update={"price": 24000, "observed_at": newer.observed_at - timedelta(hours=1)}
    )
    groups = group_listings([older, newer])
    assert len(groups) == 1 and len(groups[0].offers) == 1
    assert groups[0].listing.price == 23000


def test_import_preserves_observation_and_invalid_export_does_not_replace_snapshot(tmp_path):
    row = advert().model_dump(mode="json", by_alias=True)
    source = tmp_path / "dealer.json"
    output = tmp_path / "current.json"
    source.write_text(json.dumps([row]))
    script = Path(__file__).parents[1] / "scripts" / "import_listings.py"
    command = [sys.executable, str(script), str(source), "--output", str(output)]
    assert subprocess.run(command, capture_output=True, check=False).returncode == 0
    before = output.read_bytes()
    assert (
        ListingFeed.model_validate_json(before).listings[0].observed_at
        == Listing.model_validate(row).observed_at
    )
    row["observedAt"] = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    source.write_text(json.dumps([row]))
    assert subprocess.run(command, capture_output=True, check=False).returncode != 0
    assert output.read_bytes() == before
