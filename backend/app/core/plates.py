import re

PATTERNS = [
    r"[A-Z]{2}[0-9]{4}", r"[0-9]{4}[A-Z]{2}", r"[0-9]{2}[A-Z]{2}[0-9]{2}",
    r"[A-Z]{2}[0-9]{2}[A-Z]{2}", r"[A-Z]{4}[0-9]{2}", r"[0-9]{2}[A-Z]{4}",
    r"[0-9]{2}[A-Z]{3}[0-9]", r"[0-9][A-Z]{3}[0-9]{2}",
    r"[A-Z]{2}[0-9]{3}[A-Z]", r"[A-Z][0-9]{3}[A-Z]{2}",
    r"[A-Z]{3}[0-9]{2}[A-Z]", r"[A-Z][0-9]{2}[A-Z]{3}",
    r"[0-9][A-Z]{2}[0-9]{3}", r"[0-9]{3}[A-Z]{2}[0-9]",
]


def normalize_plate(value: str) -> str:
    plate = re.sub(r"[\s-]", "", value).upper()
    if not any(re.fullmatch(pattern, plate) for pattern in PATTERNS):
        raise ValueError("Invalid Dutch license plate")
    return plate
