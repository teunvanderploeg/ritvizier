"""Refresh the reviewed 2026 passenger-car tables without executing remote JavaScript.

Run from backend: python scripts/update_road_tax.py
Review the diff against the live calculator before changing the validity dates.
"""

import hashlib
import json
import re
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path

import httpx

URL = "https://www.belastingdienst.nl/common/js/iah/motorrijtuigenbelasting-tarieven.js"
source = httpx.get(URL, timeout=30).raise_for_status().text
provinces = {
    "DR": "Drenthe",
    "FL": "Flevoland",
    "FR": "Friesland",
    "GL": "Gelderland",
    "GR": "Groningen",
    "LI": "Limburg",
    "NB": "Noord-Brabant",
    "NH": "Noord-Holland",
    "OV": "Overijssel",
    "UT": "Utrecht",
    "ZL": "Zeeland",
    "ZH": "Zuid-Holland",
}
tables = {}
for code in provinces:
    tables[code] = {}
    for name, variable in [("standard", f"data{code}"), ("particulate", f"data_FP_{code}")]:
        matches = re.findall(rf'{variable}\[(\d+)\]="([0-9#]+)"', source)
        matches.sort(key=lambda match: int(match[0]))
        rows = [[int(n) for n in value.split("#")] for _, value in matches]
        assert len(rows) >= 30, (code, name, "incomplete table")
        assert [int(i) for i, _ in matches] == list(range(len(rows))), (
            code,
            name,
            [i for i, _ in matches],
        )
        assert rows[0][0] == 1 and all(a[0] < b[0] for a, b in pairwise(rows))
        assert all(len(r) == (6 if name == "standard" else 2) for r in rows)
        tables[code][name] = rows
payload = {
    "validFrom": "2026-07-01",
    "validThrough": "2026-12-31",
    "year": 2026,
    "weightBasis": "Massa rijklaar",
    "sourceUrl": URL,
    "checkedAt": datetime.now(UTC).isoformat(),
    "sha256": hashlib.sha256(source.encode()).hexdigest(),
    "columns": [
        "minimumReadyMassKg",
        "petrol",
        "diesel",
        "legacyZeroEmissionUnused",
        "lpgG3",
        "lpgOther",
    ],
    "provinces": provinces,
    "tables": tables,
}
target = Path(__file__).resolve().parents[1] / "app" / "data" / "road_tax_2026.json"
target.parent.mkdir(exist_ok=True)
serialized = json.dumps(payload, ensure_ascii=False, indent=2)
# Keep numeric table rows on one line for readable review diffs.
serialized = re.sub(r"\[\n(?:\s*\d+,?\n){2,}\s*\]", lambda m: re.sub(r"\s+", " ", m[0]), serialized)
target.write_text(serialized + "\n", encoding="utf-8")
print(f"Saved {len(provinces)} provincial tables to {target}")
