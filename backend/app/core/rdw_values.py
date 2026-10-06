from datetime import date
from math import isfinite
from typing import Any


def text(value: Any) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def number(value: Any) -> float | None:
    try:
        result = float(str(value).replace(",", "."))
        return result if isfinite(result) and result >= 0 else None
    except (ValueError, TypeError):
        return None


def integer(value: Any) -> int | None:
    result = number(value)
    return int(result) if result is not None and result.is_integer() else None


def source_date(value: Any) -> str | None:
    if value is None:
        return None
    raw = str(value)
    try:
        return (
            date(int(raw[:4]), int(raw[4:6]), int(raw[6:])).isoformat()
            if len(raw) == 8
            else date.fromisoformat(raw.split("T")[0]).isoformat()
        )
    except ValueError:
        return None


def boolean(value: Any) -> bool | None:
    return {"Ja": True, "Nee": False, "J": True, "N": False}.get(str(value))
