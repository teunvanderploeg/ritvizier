"""Bounded snapshot import and conservative cross-site duplicate matching."""

import hashlib
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.schemas.listings import Listing, ListingFeed, ListingGroup, ListingQuery, ListingResults


def normalized(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").casefold())


def identity(value: str | None) -> str:
    return normalized(value)


def duplicate_reason(a: Listing, b: Listing) -> str | None:
    # Conflicting identifiers veto even identical stock references or photos.
    for field in ("plate", "vin"):
        left, right = identity(getattr(a, field)), identity(getattr(b, field))
        if left and right and left != right:
            return None
    if normalized(a.make) != normalized(b.make) or normalized(a.model) != normalized(b.model):
        return None
    for field in ("plate", "vin"):
        left, right = identity(getattr(a, field)), identity(getattr(b, field))
        if left and left == right:
            return "Gelijk kenteken" if field == "plate" else "Gelijk VIN"
    if a.source == b.source and a.source_id == b.source_id:
        return "Dezelfde bronadvertentie"
    # sellerId must be a shared dealer identifier, never a display-name guess.
    same_seller = bool(a.seller_id and a.seller_id == b.seller_id)
    if same_seller and a.stock_id and a.stock_id == b.stock_id:
        return "Gelijke verkoper en voorraadreferentie"
    details_match = all(
        getattr(a, field) is not None
        and normalized(str(getattr(a, field))) != ""
        and normalized(str(getattr(a, field))) == normalized(str(getattr(b, field)))
        for field in ("year", "trim", "fuel", "transmission", "color")
    )
    close_mileage = (
        a.mileage is not None
        and b.mileage is not None
        and a.mileage > 100
        and b.mileage > 100
        and abs(a.mileage - b.mileage) <= 100
    )
    if (
        same_seller
        and details_match
        and close_mileage
        and a.photo_hash
        and a.photo_hash == b.photo_hash
    ):
        return "Gelijke verkoper, foto en voertuigdetails"
    return None


def group_listings(rows: list[Listing]) -> list[ListingGroup]:
    groups: list[ListingGroup] = []
    # Index strong signals instead of comparing every advert to every other advert.
    candidates: dict[str, set[int]] = {}
    seen: set[tuple[str, str]] = set()
    for row in sorted(rows, key=lambda r: (r.observed_at, r.source, r.source_id), reverse=True):
        source_key = (row.source, row.source_id)
        if source_key in seen:
            continue
        seen.add(source_key)
        keys = [f"source:{row.source}:{row.source_id}"]
        for field in ("plate", "vin"):
            if value := identity(getattr(row, field)):
                keys.append(f"{field}:{value}")
        if row.seller_id:
            if row.stock_id:
                keys.append(f"stock:{row.seller_id}:{row.stock_id}")
            if row.photo_hash:
                keys.append(f"photo:{row.seller_id}:{row.photo_hash}")
        possible: set[int] = set()
        for key in keys:
            possible.update(candidates.get(key, set()))
        chosen: int | None = None
        for index in sorted(possible):
            # Complete-link matching prevents an incomplete advert bridging distinct cars.
            reasons = [duplicate_reason(row, offer) for offer in groups[index].offers]
            if all(reasons):
                chosen = index
                group = groups[index]
                group.offers.append(row)
                group.match_reasons = sorted(set(group.match_reasons + [r for r in reasons if r]))
                break
        if chosen is None:
            chosen = len(groups)
            groups.append(
                ListingGroup(
                    id=hashlib.sha256(f"{row.source}:{row.source_id}".encode()).hexdigest()[:20],
                    listing=row,
                    offers=[row],
                    match_reasons=[],
                )
            )
        for key in keys:
            candidates.setdefault(key, set()).add(chosen)
    return groups


def matches(row: Listing, query: ListingQuery) -> bool:
    for field in ("make", "fuel", "transmission"):
        requested = normalized(getattr(query, field))
        if requested and requested != normalized(getattr(row, field)):
            return False
    for field in ("model", "location"):
        requested = normalized(getattr(query, field))
        if requested and requested not in normalized(getattr(row, field)):
            return False
    if query.year_min is not None and (row.year is None or row.year < query.year_min):
        return False
    if query.year_max is not None and (row.year is None or row.year > query.year_max):
        return False
    if query.price_max is not None and (row.price is None or row.price > query.price_max):
        return False
    return not (
        query.mileage_max is not None and (row.mileage is None or row.mileage > query.mileage_max)
    )


def search_feed(path: str | None, query: ListingQuery) -> ListingResults:
    if not path:
        return ListingResults(
            available=False,
            page=query.page,
            reason="Er is nog geen gratis advertentiebron aangesloten.",
        )
    try:
        with Path(path).open("rb") as stream:
            payload = stream.read(8 * 1024 * 1024 + 1)
        if len(payload) > 8 * 1024 * 1024:
            raise ValueError("Feed too large")
        feed = ListingFeed.model_validate_json(payload)
    except (OSError, ValueError):
        return ListingResults(
            available=False,
            page=query.page,
            reason="De advertentiebron is tijdelijk niet beschikbaar.",
        )
    now = datetime.now(UTC)
    cutoff = now - timedelta(hours=24)
    if feed.updated_at < cutoff or feed.updated_at > now + timedelta(minutes=5):
        return ListingResults(
            available=False,
            page=query.page,
            reason="De advertentiebron is verouderd. Nieuwe gegevens zijn nodig.",
        )
    fresh = [
        row for row in feed.listings if cutoff <= row.observed_at <= now + timedelta(minutes=5)
    ]
    groups = group_listings(fresh)
    found: list[ListingGroup] = []
    for group in groups:
        matching = [row for row in group.offers if matches(row, query)]
        if matching:
            # Display an advert satisfying ALL filters, retain every source in the group.
            group.listing = matching[0]
            found.append(group)
    if query.sort == "price":
        found.sort(key=lambda g: (g.listing.price is None, g.listing.price or 0, g.id))
    start = (query.page - 1) * 24
    return ListingResults(
        available=True,
        updated_at=feed.updated_at,
        groups=found[start : start + 24],
        total=len(found),
        advert_count=sum(len(g.offers) for g in found),
        page=query.page,
        warnings=["Verouderde advertenties zijn weggelaten."]
        if len(fresh) != len(feed.listings)
        else [],
    )
