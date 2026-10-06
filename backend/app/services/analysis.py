"""Pure analysis of normalized values. No network or storage operations."""

from collections import defaultdict
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.schemas.vehicle import AnalysisWarning, Vehicle, VehicleAnalysis


def parsed_date(value: str | None) -> date | None:
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


def analyze_vehicle(vehicle: Vehicle, today: date | None = None) -> VehicleAnalysis:
    today = today or datetime.now(ZoneInfo("Europe/Amsterdam")).date()
    v = vehicle
    first = parsed_date(v.first_registration_date)
    local = parsed_date(v.first_registration_netherlands_date)
    registered = parsed_date(v.registration_date)
    expiry = parsed_date(v.apk_expiry_date)
    result = VehicleAnalysis(
        calculated_at=today.isoformat(),
        apk_notice_days=max(settings.apk_notice_days, settings.apk_urgent_days),
        apk_urgent_days=settings.apk_urgent_days,
    )
    if first and first <= today:
        result.age_months = (
            (today.year - first.year) * 12 + today.month - first.month - (today.day < first.day)
        )
    if first and local and local >= first:
        result.import_age_days = (local - first).days
    if registered and registered <= today:
        result.registration_duration_days = (today - registered).days
    result.apk_exempt = (
        v.vehicle_type == "Personenauto"
        and v.max_mass_kg is not None
        and v.max_mass_kg <= 3500
        and result.age_months is not None
        and result.age_months >= 600
    )
    if result.apk_exempt:
        result.apk_status = "exempt"
    elif expiry:
        days = result.apk_days_remaining = (expiry - today).days
        result.apk_status = (
            "expired"
            if days < 0
            else "urgent"
            if days <= result.apk_urgent_days
            else "soon"
            if days <= result.apk_notice_days
            else "valid"
        )
    if v.power_hp is not None and v.ready_mass_kg and v.ready_mass_kg > 0:
        result.power_hp_per_ton = round(v.power_hp / v.ready_mass_kg * 1000, 1)

    def warn(
        code: str,
        title: str,
        description: str,
        severity: Literal["info", "warning", "critical"] = "warning",
    ) -> None:
        result.warnings.append(
            AnalysisWarning(code=code, severity=severity, title=title, description=description)
        )

    if result.apk_status == "expired":
        warn("APK_EXPIRED", "APK verlopen", "De geregistreerde APK-vervaldatum is verstreken.")
    elif result.apk_status in {"soon", "urgent"}:
        warn(
            "APK_EXPIRING_SOON",
            "APK verloopt binnenkort",
            f"De geregistreerde APK verloopt over {result.apk_days_remaining} dagen.",
        )
    if v.odometer_judgment == "Onlogisch":
        warn(
            "MILEAGE_JUDGEMENT_ILLOGICAL",
            "Onlogisch tellerstandoordeel",
            "Controleer het voertuigrapport en de onderhoudsbewijzen.",
        )
    elif v.odometer_judgment in {"Geen oordeel", "Niet geregistreerd"}:
        warn(
            "MILEAGE_NO_JUDGEMENT",
            "Geen tellerstandoordeel",
            "Er is geen logisch/onlogisch oordeel beschikbaar. Lees de geregistreerde toelichting.",
            "info",
        )
    if v.is_import:
        warn(
            "LIKELY_IMPORTED",
            "Waarschijnlijk geïmporteerd",
            "De Nederlandse registratie is later dan de eerste toelating. "
            "Controleer ook de buitenlandse historie.",
            "info",
        )
    if v.recall_pending is True or any(r.status_code == "O" for r in v.recalls):
        warn(
            "OPEN_RECALL",
            "Openstaande terugroepactie",
            "De kentekenindicator of een gekoppelde actie vermeldt een open terugroepactie.",
        )
    if v.registration_possible is False:
        warn(
            "NOT_TRANSFERABLE",
            "Tenaamstellen niet mogelijk",
            "Volgens de opgehaalde registratie is tenaamstellen niet mogelijk.",
        )
    if v.is_exported:
        warn("EXPORTED", "Export geregistreerd", "Het voertuig heeft een exportindicator.")
    if v.waiting_for_inspection:
        warn(
            "WAITING_FOR_INSPECTION",
            "Wacht op keuren",
            "Er is een wacht-op-keurenstatus geregistreerd. Controleer de actuele status.",
        )
    if v.wam_insured is False:
        warn(
            "WAM_NOT_INSURED",
            "Geen WAM-verzekering geregistreerd",
            "Controleer de actuele dekking met de verzekeraar.",
        )
    if (
        result.registration_duration_days is not None
        and result.registration_duration_days < settings.recent_registration_days
    ):
        warn(
            "RECENT_REGISTRATION_CHANGE",
            "Recent op naam gezet",
            f"De laatste tenaamstelling was {result.registration_duration_days} dagen geleden. "
            "Dit is geen bewijs van een technisch probleem.",
            "info",
        )

    categories: dict[str, set[str]] = defaultdict(set)
    for event in v.apk_history.inspections:
        if event.has_notification:
            result.inspection_count += 1
        if event.defects:
            result.inspections_with_defects += 1
        for defect in event.defects:
            if defect.count is None:
                result.defect_count_complete = False
            else:
                result.defect_count += defect.count
            if defect.category:
                categories[defect.category].add(event.date)
    for category, dates in sorted(categories.items()):
        if len(dates) > 1:
            warn(
                "REPEATED_APK_DEFECT",
                f"Terugkerende opmerkingen: {category}",
                f"Bij {len(dates)} verschillende meldingsdatums zijn opmerkingen over "
                f"{category} geregistreerd. Dit zegt niets over de actuele staat.",
            )
    return result
