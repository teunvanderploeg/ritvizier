"""Validate and combine authorized JSON/CSV dealer exports; never scrape websites."""

import argparse
import csv
import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.schemas.listings import Listing, ListingFeed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    rows: list[Listing] = []
    now = datetime.now(UTC)
    for path in args.inputs:
        if path.stat().st_size > 8 * 1024 * 1024:
            parser.error(f"Export too large: {path.name}")
        if path.suffix.lower() == ".csv":
            with path.open(encoding="utf-8-sig", newline="") as stream:
                records = [
                    {key: value or None for key, value in row.items()}
                    for row in csv.DictReader(stream)
                ]
        else:
            records = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(records, list):
            parser.error("Each JSON export must be an array of listing records")
        rows.extend(Listing.model_validate(record) for record in records)
    if any(
        not now - timedelta(hours=24) <= row.observed_at <= now + timedelta(minutes=5)
        for row in rows
    ):
        parser.error("Exports must contain observations from the last 24 hours")
    feed = ListingFeed(updated_at=now, listings=rows)
    payload = feed.model_dump_json(by_alias=True, indent=2)
    if len(payload.encode()) > 8 * 1024 * 1024:
        parser.error("Combined export exceeds 8 MiB")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(payload, encoding="utf-8")
    os.replace(temporary, args.output)
    print(f"Imported {len(rows)} adverts. Source timestamps preserved.")


if __name__ == "__main__":
    main()
