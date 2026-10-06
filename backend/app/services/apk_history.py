"""Join APK notifications, observations and date-valid official descriptions."""

from typing import Any

from app.core.rdw_values import integer, source_date, text
from app.schemas.vehicle import ApkHistory, Inspection, InspectionDefect


def category(description: str | None) -> str | None:
    if not description:
        return None
    value = description.lower()
    groups = {
        "remmen": ("rem",),
        "banden en wielen": ("band", "wiel", "velg"),
        "verlichting": ("licht", "lamp", "reflector"),
        "onderstel": ("ophanging", "veer", "schokdemper", "draagarm", "stuur"),
        "carrosserie": ("carrosserie", "roest", "corrosie", "deur", "chassis"),
        "uitlaat en emissies": ("uitlaat", "emissie", "roet"),
    }
    return next((label for label, words in groups.items() if any(w in value for w in words)), None)


def description_for(code: str, when: str, references: list[dict[str, Any]]) -> str | None:
    candidates = []
    for row in references:
        if text(row.get("gebrek_identificatie")) != code:
            continue
        start = source_date(row.get("ingangsdatum_gebrek"))
        end = source_date(row.get("einddatum_gebrek"))
        if (start is None or start <= when) and (end is None or when < end):
            candidates.append(text(row.get("gebrek_omschrijving")))
    valid = set(candidates)
    return next(iter(valid)) if len(valid) == 1 and None not in valid else None


def normalize_history(
    plate: str,
    notifications: list[dict[str, Any]],
    defects: list[dict[str, Any]],
    references: list[dict[str, Any]],
    notifications_available: bool,
    defects_available: bool,
    descriptions_available: bool,
    truncated: bool = False,
) -> ApkHistory:
    events: dict[str, Inspection] = {}

    def event_for(row: dict[str, Any]) -> Inspection | None:
        if row.get("kenteken") != plate:
            return None
        recognition = text(row.get("soort_erkenning_omschrijving"))
        code = text(row.get("soort_erkenning_keuringsinstantie"))
        if not ((recognition and recognition.upper().startswith("APK")) or code in {"AL", "AZ"}):
            return None
        when = source_date(row.get("meld_datum_door_keuringsinstantie")) or source_date(
            row.get("meld_datum_door_keuringsinstantie_dt")
        )
        if not when:
            return None
        raw_time = integer(row.get("meld_tijd_door_keuringsinstantie"))
        stamp = str(raw_time).zfill(4) if raw_time is not None else None
        if stamp is None:
            timestamp = text(row.get("meld_datum_door_keuringsinstantie_dt"))
            if timestamp and len(timestamp) >= 16 and timestamp[10] == "T":
                stamp = timestamp[11:16].replace(":", "")
        time = (
            f"{stamp[:2]}:{stamp[2:]}"
            if stamp
            and len(stamp) == 4
            and stamp.isdigit()
            and int(stamp[:2]) < 24
            and int(stamp[2:]) < 60
            else None
        )
        key = f"{when}|{time or 'unknown'}|{code or recognition or 'APK'}"
        if key not in events:
            events[key] = Inspection(
                key=key, date=when, time=time, recognition_code=code, recognition=recognition
            )
        return events[key]

    for row in notifications:
        event = event_for(row)
        if event:
            event.has_notification = True
            event.report = text(row.get("soort_melding_ki_omschrijving"))
            event.expiry_date = source_date(row.get("vervaldatum_keuring")) or source_date(
                row.get("vervaldatum_keuring_dt")
            )
    seen: dict[tuple[str, str], InspectionDefect] = {}
    for row in defects:
        event = event_for(row)
        code = text(row.get("gebrek_identificatie"))
        if event and code and (event.key, code) in seen:
            existing = seen[(event.key, code)]
            if existing.count != integer(row.get("aantal_gebreken_geconstateerd")):
                existing.count = None
        elif event and code:
            description = description_for(code, event.date, references)
            event.defects.append(
                InspectionDefect(
                    code=code,
                    description=description,
                    count=integer(row.get("aantal_gebreken_geconstateerd")),
                    category=category(description),
                )
            )
            seen[(event.key, code)] = event.defects[-1]
    return ApkHistory(
        inspections=sorted(events.values(), key=lambda e: (e.date, e.time or ""), reverse=True),
        notifications_available=notifications_available,
        defects_available=defects_available,
        descriptions_available=descriptions_available,
        truncated=truncated,
    )
