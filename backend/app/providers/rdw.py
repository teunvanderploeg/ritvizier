import asyncio
import re
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.core.plates import normalize_plate
from app.core.rdw_values import boolean, integer, number, source_date, text
from app.providers.rdw_client import DATASETS, SECTION_LABELS, ProviderUnavailable, RdwClient
from app.schemas.vehicle import (
    Axle,
    BodyRecord,
    BodySpecification,
    FuelRecord,
    Recall,
    SectionSource,
    SourceInfo,
    TypeApproval,
    Vehicle,
    VehicleClass,
)
from app.services.analysis import analyze_vehicle
from app.services.apk_history import normalize_history

__all__ = ["ProviderUnavailable", "RdwProvider", "VehicleNotFound", "normalize_vehicle"]


class VehicleNotFound(Exception):
    pass


class VehicleProvider(Protocol):
    async def get_vehicle(self, plate: str) -> Vehicle: ...


def normalize_fuel(raw: dict[str, Any]) -> FuelRecord:
    power = number(raw.get("nettomaximumvermogen"))
    return FuelRecord(
        sequence=integer(raw.get("brandstof_volgnummer")),
        name=text(raw.get("brandstof_omschrijving")),
        power_kw=power,
        power_hp=round(power * 1.35962) if power is not None else None,
        continuous_power_kw=number(raw.get("nominaal_continu_maximumvermogen")),
        electric_power_kw=number(raw.get("netto_max_vermogen_elektrisch")),
        consumption_nedc=number(raw.get("brandstofverbruik_gecombineerd")),
        consumption_wltp=number(raw.get("brandstof_verbruik_gecombineerd_wltp")),
        consumption_weighted_wltp=number(raw.get("brandstof_verbruik_gewogen_gecombineerd_wltp")),
        consumption_city=number(raw.get("brandstofverbruik_stad")),
        consumption_highway=number(raw.get("brandstofverbruik_buiten")),
        co2_nedc=number(raw.get("co2_uitstoot_gecombineerd")),
        co2_weighted_nedc=number(raw.get("co2_uitstoot_gewogen")),
        co2_wltp=number(raw.get("emissie_co2_gecombineerd_wltp")),
        co2_weighted_wltp=number(raw.get("emis_co2_gewogen_gecombineerd_wltp")),
        emission_class=text(raw.get("uitlaatemissieniveau"))
        or text(raw.get("emissiecode_omschrijving")),
        particulate_g_km=number(raw.get("uitstoot_deeltjes_licht")),
        particulate_wltp=number(raw.get("emis_deeltjes_type1_wltp")),
        electric_consumption_wh_km=number(raw.get("elektrisch_verbruik_enkel_elektrisch_wltp"))
        or number(raw.get("elektrisch_verbruik_extern_opladen_wltp")),
        electric_range_km=number(raw.get("actie_radius_enkel_elektrisch_wltp"))
        or number(raw.get("actie_radius_extern_opladen_wltp")),
        hybrid_class=text(raw.get("klasse_hybride_elektrisch_voertuig")),
    )


def normalize_vehicle(
    raw: dict[str, Any],
    fuels: list[dict[str, Any]],
    fetched_at: datetime,
    fuel_available: bool = True,
) -> Vehicle:
    fuel = next(
        (item for item in fuels if item.get("brandstof_omschrijving") != "Elektriciteit"), {}
    )
    electric = next(
        (item for item in fuels if item.get("brandstof_omschrijving") == "Elektriciteit"), {}
    )
    if not fuel:
        fuel = electric
    power = number(fuel.get("nettomaximumvermogen"))
    electric_power = number(
        electric.get("netto_max_vermogen_elektrisch") or electric.get("nettomaximumvermogen")
    )
    if power is None:
        power = electric_power
    first = source_date(raw.get("datum_eerste_toelating"))
    local = source_date(raw.get("datum_eerste_tenaamstelling_in_nederland"))
    ready = integer(raw.get("massa_rijklaar"))
    maximum = integer(raw.get("toegestane_maximum_massa_voertuig"))
    official_payload = integer(raw.get("laadvermogen"))
    electric_wh_per_km = number(
        electric.get("elektrisch_verbruik_enkel_elektrisch_wltp")
        or electric.get("elektrisch_verbruik_extern_opladen_wltp")
    )
    vehicle = Vehicle(
        license_plate=raw["kenteken"],
        make=raw["merk"],
        model=raw.get("handelsbenaming"),
        vehicle_type=raw.get("voertuigsoort"),
        body_type=raw.get("inrichting"),
        first_registration_date=first,
        first_registration_netherlands_date=local,
        apk_expiry_date=source_date(raw.get("vervaldatum_apk")),
        fuel_types=list(
            dict.fromkeys(
                f["brandstof_omschrijving"] for f in fuels if f.get("brandstof_omschrijving")
            )
        ),
        fuels=[normalize_fuel(f) for f in fuels],
        waiting_for_inspection=boolean(raw.get("wacht_op_keuren")),
        original_dimensions={
            key: str(raw[key])
            for key in ("lengte", "breedte", "hoogte_voertuig", "wielbasis")
            if raw.get(key) is not None
        },
        power_kw=power,
        power_hp=round(power * 1.35962) if power is not None else None,
        electric_power_kw=electric_power,
        mass_kg=integer(raw.get("massa_ledig_voertuig")),
        ready_mass_kg=ready,
        max_mass_kg=maximum,
        payload_kg=official_payload
        if official_payload is not None
        else maximum - ready
        if maximum is not None and ready is not None and maximum >= ready
        else None,
        payload_derived=official_payload is None
        and maximum is not None
        and ready is not None
        and maximum >= ready,
        catalog_price=integer(raw.get("catalogusprijs")),
        bpm=integer(raw.get("bruto_bpm")),
        color_primary=raw.get("eerste_kleur"),
        color_secondary=raw.get("tweede_kleur"),
        registration_date=source_date(raw.get("datum_tenaamstelling")),
        wam_insured=boolean(raw.get("wam_verzekerd")),
        type_code=raw.get("type"),
        variant=raw.get("variant"),
        version=raw.get("uitvoering"),
        type_approval_number=raw.get("typegoedkeuringsnummer"),
        european_category=raw.get("europese_voertuigcategorie"),
        number_of_wheels=integer(raw.get("aantal_wielen")),
        standing_places=integer(raw.get("aantal_staanplaatsen")),
        technical_max_mass_kg=integer(raw.get("technische_max_massa_voertuig")),
        combination_max_mass_kg=integer(raw.get("maximum_massa_samenstelling")),
        coupling_max_load_kg=integer(raw.get("maximum_last_onder_de_koppeling")),
        odometer_judgment=raw.get("tellerstandoordeel"),
        odometer_judgment_code=raw.get("code_toelichting_tellerstandoordeel"),
        odometer_last_year=integer(raw.get("jaar_laatste_registratie_tellerstand")),
        consumption_wltp=number(fuel.get("brandstof_verbruik_gecombineerd_wltp")),
        consumption_city=number(fuel.get("brandstofverbruik_stad")),
        consumption_highway=number(fuel.get("brandstofverbruik_buiten")),
        emissions_co2_wltp=number(fuel.get("emissie_co2_gecombineerd_wltp")),
        emissions_co2_nedc=number(fuel.get("co2_uitstoot_gecombineerd")),
        particulate_emissions_wltp=number(fuel.get("emis_deeltjes_type1_wltp")),
        particulate_emissions=number(fuel.get("uitstoot_deeltjes_licht")),
        noise_stationary_db=number(fuel.get("geluidsniveau_stationair")),
        noise_driving_db=number(fuel.get("geluidsniveau_rijdend")),
        noise_rpm=integer(fuel.get("toerental_geluidsniveau")),
        environmental_approval=fuel.get("milieuklasse_eg_goedkeuring_licht"),
        electric_range_km=integer(
            electric.get("actie_radius_enkel_elektrisch_wltp")
            or electric.get("actie_radius_extern_opladen_wltp")
        ),
        hybrid_class=next(
            (
                f["klasse_hybride_elektrisch_voertuig"]
                for f in fuels
                if f.get("klasse_hybride_elektrisch_voertuig")
            ),
            None,
        ),
        consumption_weighted_wltp=number(fuel.get("brandstof_verbruik_gewogen_gecombineerd_wltp")),
        emissions_co2_weighted_wltp=number(fuel.get("emis_co2_gewogen_gecombineerd_wltp")),
        number_of_seats=integer(raw.get("aantal_zitplaatsen")),
        number_of_doors=integer(raw.get("aantal_deuren")),
        engine_capacity_cc=integer(raw.get("cilinderinhoud")),
        cylinders=integer(raw.get("aantal_cilinders")),
        emissions_co2=number(
            fuel.get("emissie_co2_gecombineerd_wltp") or fuel.get("co2_uitstoot_gecombineerd")
        ),
        emission_class=fuel.get("uitlaatemissieniveau")
        or fuel.get("emissiecode_omschrijving")
        or electric.get("emissiecode_omschrijving"),
        consumption_combined=number(fuel.get("brandstofverbruik_gecombineerd")),
        electric_consumption=electric_wh_per_km / 10 if electric_wh_per_km is not None else None,
        length_cm=integer(raw.get("lengte")),
        width_cm=integer(raw.get("breedte")),
        height_cm=integer(raw.get("hoogte_voertuig")),
        wheelbase_cm=integer(raw.get("wielbasis")),
        towing_braked_kg=integer(raw.get("maximum_trekken_massa_geremd")),
        towing_unbraked_kg=integer(raw.get("maximum_massa_trekken_ongeremd")),
        max_speed_kmh=integer(raw.get("maximale_constructiesnelheid")),
        is_import=local > first if first and local else None,
        is_exported=boolean(raw.get("export_indicator")),
        is_taxi=boolean(raw.get("taxi_indicator")),
        recall_pending=boolean(raw.get("openstaande_terugroepactie_indicator")),
        registration_possible=boolean(raw.get("tenaamstellen_mogelijk")),
        source=SourceInfo(
            datasets=["m9d7-ebf2"] + (["8ys7-d773"] if fuel_available else []),
            fetched_at=fetched_at,
        ),
    )
    vehicle.source.missing_fields = [
        field
        for field in [
            "model",
            "firstRegistrationDate",
            "apkExpiryDate",
            "powerKw",
            "massKg",
            "emissionsCo2",
            "catalogPrice",
            "consumptionCombined",
        ]
        if vehicle.model_dump(by_alias=True).get(field) is None
    ]
    if not vehicle.fuel_types:
        vehicle.source.missing_fields.append("fuelTypes")
    vehicle.source.derived_fields = [
        field
        for field in ["powerHp", "payloadKg", "isImport"]
        if vehicle.model_dump(by_alias=True).get(field) is not None
    ]
    if not vehicle.payload_derived and "payloadKg" in vehicle.source.derived_fields:
        vehicle.source.derived_fields.remove("payloadKg")
    if not fuel_available:
        vehicle.source.warnings.append("Brandstofgegevens zijn tijdelijk niet beschikbaar.")
    return vehicle


class RdwProvider:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.data = RdwClient(client)

    async def _query(self, dataset: str, params: dict[str, str]) -> list[dict[str, Any]]:
        return await self.data.query(dataset, params)

    def _warning(self, vehicle: Vehicle, section: str, message: str) -> None:
        vehicle.source.partial = True
        if section not in vehicle.source.unavailable_sections:
            vehicle.source.unavailable_sections.append(section)
        if message not in vehicle.source.warnings:
            vehicle.source.warnings.append(message)

    def _record(
        self,
        vehicle: Vehicle,
        dataset: str,
        params: dict[str, str],
        rows: list[dict[str, Any]] | None,
    ) -> None:
        spec = DATASETS[dataset]
        previous = vehicle.source.sections.get(spec.section)
        available = rows is not None and (previous is None or previous.available)
        truncated = (rows is not None and len(rows) >= spec.limit) or bool(
            previous and previous.truncated
        )
        fetched_at = self.data.fetched_at(dataset, params)
        vehicle.source.sections[spec.section] = SectionSource(
            datasets=[dataset],
            fetched_at=min(fetched_at, previous.fetched_at) if previous else fetched_at,
            available=available,
            truncated=truncated,
            record_count=len(rows or []) + (previous.record_count if previous else 0),
        )
        if rows is not None and dataset not in vehicle.source.datasets:
            vehicle.source.datasets.append(dataset)
        if not available or truncated:
            self._warning(
                vehicle,
                spec.section,
                f"De gegevens voor {SECTION_LABELS[spec.section]} zijn niet volledig beschikbaar.",
            )

    async def _dataset(self, dataset: str, plate: str) -> list[dict[str, Any]]:
        return await self._query(dataset, {"kenteken": plate})

    async def get_vehicle(self, plate: str) -> Vehicle:
        plate = normalize_plate(plate)
        raw_result = await self._dataset("m9d7-ebf2", plate)
        if not raw_result:
            raise VehicleNotFound()
        if (
            len(raw_result) != 1
            or raw_result[0].get("kenteken") != plate
            or not isinstance(raw_result[0].get("merk"), str)
        ):
            raise ProviderUnavailable()
        dataset_ids = [
            "8ys7-d773",
            "3huj-srit",
            "vezc-m2t6",
            "jhie-znh9",
            "kmfi-hrps",
            "sgfe-77wx",
            "a34c-vvps",
            "t49b-isb7",
            "mu2x-mu5e",
        ]
        queries = [
            {"merk": raw_result[0]["merk"]} if ds == "mu2x-mu5e" else {"kenteken": plate}
            for ds in dataset_ids
        ]
        results = await asyncio.gather(
            *(self._query(ds, params) for ds, params in zip(dataset_ids, queries, strict=True)),
            return_exceptions=True,
        )
        fuel_result = results[0]
        fuel_available = not isinstance(fuel_result, BaseException)

        def plate_rows(value: Any) -> list[dict[str, Any]]:
            return (
                [r for r in value if r.get("kenteken") == plate] if isinstance(value, list) else []
            )

        fuels = [
            {
                k: val
                for k, val in row.items()
                if val is None or isinstance(val, (str, int, float, bool))
            }
            for row in plate_rows(fuel_result)
        ]
        try:
            vehicle = normalize_vehicle(raw_result[0], fuels, datetime.now(UTC), fuel_available)
            self._record(vehicle, "m9d7-ebf2", {"kenteken": plate}, raw_result)
            for ds, params, result in zip(dataset_ids, queries, results, strict=True):
                self._record(vehicle, ds, params, result if isinstance(result, list) else None)
            axes = plate_rows(results[1])
            vehicle.axes = [
                Axle(
                    number=integer(item.get("as_nummer")),
                    position=text(item.get("plaatscode_as")),
                    track_cm=integer(item.get("spoorbreedte")),
                    max_mass_kg=integer(item.get("wettelijk_toegestane_maximum_aslast")),
                    technical_max_mass_kg=integer(item.get("technisch_toegestane_maximum_aslast")),
                    driven=boolean(item.get("aangedreven_as")),
                    liftable=boolean(item.get("hefas")),
                    braked=boolean(item.get("geremde_as_indicator")),
                    suspension_code=text(item.get("weggedrag_code")),
                )
                for item in axes
            ]
            vehicle.bodies = [
                BodyRecord(
                    sequence=integer(r.get("carrosserie_volgnummer")),
                    code=text(r.get("carrosserietype")),
                    description=text(r.get("type_carrosserie_europese_omschrijving")),
                )
                for r in plate_rows(results[2])
            ]
            vehicle.body_code = vehicle.bodies[0].code if len(vehicle.bodies) == 1 else None
            vehicle.body_specifications = [
                BodySpecification(
                    sequence=integer(r.get("carrosserie_volgnummer")),
                    code=text(r.get("carrosseriecode")),
                    specification_sequence=integer(
                        r.get("carrosserie_voertuig_nummer_code_volgnummer")
                    ),
                    description=text(r.get("carrosserie_voertuig_nummer_europese_omschrijving")),
                )
                for r in plate_rows(results[3])
            ]
            vehicle.vehicle_classes = [
                VehicleClass(
                    body_sequence=integer(r.get("carrosserie_volgnummer")),
                    sequence=integer(r.get("carrosserie_klasse_volgnummer")),
                    code=text(r.get("voertuigklasse")),
                    description=text(r.get("voertuigklasse_omschrijving")),
                )
                for r in plate_rows(results[4])
            ]
            statuses = plate_rows(results[7])
            vehicle.recall_details_available = isinstance(results[7], list) and len(statuses) < 1000
            statuses = [
                s for s in statuses if s.get("kenteken") == plate and s.get("referentiecode_rdw")
            ]
            await asyncio.gather(
                self._odometer(vehicle),
                self._type_approval(vehicle),
                self._recalls(vehicle, statuses),
                self._history(vehicle, results[5], results[6]),
                self._possible_recalls(vehicle, results[8]),
            )
            exact_refs = {r.reference for r in vehicle.recalls}
            vehicle.possible_recalls = [
                r for r in vehicle.possible_recalls if r.reference not in exact_refs
            ]
            vehicle.analysis = analyze_vehicle(vehicle)
            return vehicle
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderUnavailable() from exc

    async def _odometer(self, vehicle: Vehicle) -> None:
        if not vehicle.odometer_judgment_code:
            return
        try:
            params = {"code_toelichting_tellerstandoordeel": vehicle.odometer_judgment_code}
            rows = await self._query("jqs4-4kvw", params)
            self._record(vehicle, "jqs4-4kvw", params, rows)
            if rows:
                vehicle.odometer_explanation = text(rows[0].get("toelichting_tellerstandoordeel"))
        except ProviderUnavailable:
            self._record(vehicle, "jqs4-4kvw", params, None)
            self._warning(
                vehicle,
                "odometerExplanation",
                "De toelichting bij het tellerstandoordeel is tijdelijk niet beschikbaar.",
            )

    async def _type_approval(self, vehicle: Vehicle) -> None:
        if not all([vehicle.type_approval_number, vehicle.variant, vehicle.version]):
            return
        params = {
            "typegoedkeuringsnummer": vehicle.type_approval_number or "",
            "codevarianttgk": vehicle.variant or "",
            "codeuitvoeringtgk": vehicle.version or "",
        }
        datasets = ["byxc-wwua", "7rjk-eycs"]
        results = await asyncio.gather(
            *(self._query(d, params) for d in datasets), return_exceptions=True
        )
        valid: list[list[dict[str, Any]]] = []
        for dataset, result in zip(datasets, results, strict=True):
            self._record(vehicle, dataset, params, result if isinstance(result, list) else None)
            if isinstance(result, BaseException):
                self._warning(
                    vehicle,
                    DATASETS[dataset].section,
                    "Een deel van de typegoedkeuringsgegevens is tijdelijk niet beschikbaar.",
                )
                valid.append([])
            else:
                # Never join only by model name or select an arbitrary approval revision.
                valid.append(
                    [r for r in result if all(r.get(k) == v for k, v in params.items())]
                    if len(result) < DATASETS[dataset].limit
                    else []
                )
        base, gears = valid

        def unique(rows: list[dict[str, Any]], key: str) -> str | None:
            values = {str(r[key]) for r in rows if r.get(key) is not None}
            return values.pop() if len(values) == 1 and all(key in r for r in rows) else None

        def exact(rows: list[dict[str, Any]], prefix: str) -> int | None:
            low, high = unique(rows, prefix + "ondergrens"), unique(rows, prefix + "bovengrens")
            return integer(low) if low is not None and low == high else None

        code = unique(gears, "codetypeversnellingsbak")
        vehicle.type_approval = TypeApproval(
            matched=bool(base or gears),
            transmission_code=code,
            transmission={"A": "Automaat", "M": "Handgeschakeld"}.get(code or ""),
            gears=exact(gears, "aantalversnellingen"),
            length_mm=exact(base, "lengte"),
            width_mm=exact(base, "breedte"),
            height_mm=exact(base, "hoogte"),
            wheelbase_mm=exact(base, "wielbasis"),
        )

    async def _recall_detail(
        self, vehicle: Vehicle, status: dict[str, Any], possible: bool = False
    ) -> Recall:
        reference = str(status["referentiecode_rdw"])
        params = {"referentiecode_rdw": reference}
        results = await asyncio.gather(
            self._query("j9yg-7rg9", params),
            self._query("9ihi-jgpf", params),
            return_exceptions=True,
        )
        for ds, result in zip(["j9yg-7rg9", "9ihi-jgpf"], results, strict=True):
            self._record(vehicle, ds, params, result if isinstance(result, list) else None)
            if isinstance(result, BaseException):
                if possible:
                    vehicle.possible_recalls_available = False
                else:
                    vehicle.recall_details_available = False
        rows = results[0] if isinstance(results[0], list) else []
        raw = next((r for r in rows if r.get("referentiecode_rdw") == reference), {})
        risks = results[1] if isinstance(results[1], list) else []
        return Recall(
            reference=reference,
            status_code=text(status.get("code_status")),
            status=text(status.get("status")),
            publication_date=source_date(raw.get("publicatiedatum_rdw")),
            producer=text(raw.get("meldende_producent_distributeur")),
            producer_reference=text(raw.get("referentiecode_producent")),
            defect=text(raw.get("omschrijving_defect")),
            consequences=text(raw.get("materi_le_gevolgen")),
            remedy=text(raw.get("beschrijving_van_het_herstel")),
            risks=[
                value
                for r in risks
                if r.get("referentiecode_rdw") == reference
                and (value := text(r.get("mogelijk_gevaar")))
            ],
            url=text(raw.get("meer_informatie_op_internet")),
            phone=text(raw.get("meer_informatie_via_telefoonnummer")),
        )

    async def _recalls(self, vehicle: Vehicle, statuses: list[dict[str, Any]]) -> None:
        # At most 20 campaigns: guard the provider against an unexpectedly large fan-out.
        if len(statuses) > 20:
            vehicle.recall_details_available = False
            self._warning(
                vehicle,
                "recallStatuses",
                "Niet alle terugroepacties worden getoond. Controleer het RDW-register.",
            )
        vehicle.recalls = await asyncio.gather(
            *(self._recall_detail(vehicle, s) for s in statuses[:20])
        )

    async def _history(self, vehicle: Vehicle, notifications: Any, defects: Any) -> None:
        references: list[dict[str, Any]] = []
        descriptions_available = True
        if isinstance(defects, list) and defects:
            try:
                references = await self._query("hx2c-gt7k", {})
                self._record(vehicle, "hx2c-gt7k", {}, references)
                descriptions_available = len(references) < DATASETS["hx2c-gt7k"].limit
            except ProviderUnavailable:
                self._record(vehicle, "hx2c-gt7k", {}, None)
                descriptions_available = False
        vehicle.apk_history = normalize_history(
            vehicle.license_plate,
            notifications if isinstance(notifications, list) else [],
            defects if isinstance(defects, list) else [],
            references,
            isinstance(notifications, list),
            isinstance(defects, list),
            descriptions_available,
            truncated=any(
                vehicle.source.sections[s].truncated
                for s in ("inspectionNotifications", "inspectionDefects")
            ),
        )

    async def _possible_recalls(self, vehicle: Vehicle, rows: Any) -> None:
        if not isinstance(rows, list) or not vehicle.model:
            return

        def words(value: str) -> list[str]:
            return re.findall(r"[A-Z0-9]+", value.upper())

        model = words(vehicle.model)

        def matches(value: str) -> bool:
            candidate = words(value)
            return bool(candidate) and model[: len(candidate)] == candidate

        refs = sorted(
            {
                str(r["referentiecode_rdw"])
                for r in rows
                if text(r.get("merk")) == vehicle.make
                and text(r.get("type"))
                and matches(str(r["type"]))
                and text(r.get("referentiecode_rdw"))
            },
            reverse=True,
        )
        vehicle.possible_recalls_available = len(rows) < DATASETS["mu2x-mu5e"].limit
        if len(refs) > 5:
            self._warning(
                vehicle,
                "possibleRecalls",
                "Er worden maximaal vijf mogelijke merk/type-acties getoond.",
            )
        vehicle.possible_recalls = sorted(
            await asyncio.gather(
                *(
                    self._recall_detail(vehicle, {"referentiecode_rdw": ref}, True)
                    for ref in refs[:5]
                )
            ),
            key=lambda r: r.publication_date or "",
            reverse=True,
        )
