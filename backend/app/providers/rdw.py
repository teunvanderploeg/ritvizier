import asyncio
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.schemas.vehicle import Axle, Recall, SourceInfo, TypeApproval, Vehicle


class VehicleNotFound(Exception):
    pass


class ProviderUnavailable(Exception):
    pass


class VehicleProvider(Protocol):
    async def get_vehicle(self, plate: str) -> Vehicle: ...


def number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        result = float(str(value).replace(",", "."))
        return result if result >= 0 and result != float("inf") else None
    except (ValueError, TypeError):
        return None


def integer(value: Any) -> int | None:
    parsed = number(value)
    return int(parsed) if parsed is not None else None


def source_date(value: Any) -> str | None:
    try:
        return datetime.strptime(str(value), "%Y%m%d").replace(tzinfo=UTC).date().isoformat()
    except ValueError:
        return None


def boolean(value: Any) -> bool | None:
    return {"Ja": True, "Nee": False}.get(value)


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
        power_kw=power,
        power_hp=round(power * 1.35962) if power is not None else None,
        electric_power_kw=electric_power,
        mass_kg=integer(raw.get("massa_ledig_voertuig")),
        ready_mass_kg=ready,
        max_mass_kg=maximum,
        payload_kg=maximum - ready
        if maximum is not None and ready is not None and maximum >= ready
        else None,
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
        emissions_co2_weighted_wltp=number(fuel.get("emissie_co2_gewogen_gecombineerd_wltp")),
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
    if not fuel_available:
        vehicle.source.warnings.append("Brandstofgegevens zijn tijdelijk niet beschikbaar.")
    return vehicle


class RdwProvider:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _query(self, dataset: str, params: dict[str, str]) -> list[dict[str, Any]]:
        try:
            response = await self.client.get(
                f"https://opendata.rdw.nl/resource/{dataset}.json",
                params={**params, "$limit": "100"},
            )
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, list) or not all(isinstance(item, dict) for item in result):
                raise ProviderUnavailable()
            return result
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderUnavailable() from exc

    async def _dataset(self, dataset: str, plate: str) -> list[dict[str, Any]]:
        return await self._query(dataset, {"kenteken": plate})

    async def get_vehicle(self, plate: str) -> Vehicle:
        dataset_ids = ["m9d7-ebf2", "8ys7-d773", "3huj-srit", "vezc-m2t6", "t49b-isb7"]
        results = await asyncio.gather(
            *(self._dataset(dataset, plate) for dataset in dataset_ids), return_exceptions=True
        )
        raw_result = results[0]
        fuel_result = results[1]
        if isinstance(raw_result, BaseException):
            raise ProviderUnavailable() from raw_result
        if not raw_result:
            raise VehicleNotFound()
        if raw_result[0].get("kenteken") != plate or not raw_result[0].get("merk"):
            raise ProviderUnavailable()
        fuel_available = not isinstance(fuel_result, BaseException)
        fuels = fuel_result if isinstance(fuel_result, list) else []
        try:
            vehicle = normalize_vehicle(raw_result[0], fuels, datetime.now(UTC), fuel_available)
            for dataset, result in zip(dataset_ids[2:], results[2:], strict=True):
                if isinstance(result, BaseException):
                    label = {
                        "3huj-srit": "Asgegevens",
                        "vezc-m2t6": "Carrosseriegegevens",
                        "t49b-isb7": "Details van terugroepacties",
                    }[dataset]
                    vehicle.source.warnings.append(f"{label} zijn tijdelijk niet beschikbaar.")
                else:
                    vehicle.source.datasets.append(dataset)
            axes = results[2] if isinstance(results[2], list) else []
            vehicle.axes = [
                Axle(
                    number=integer(item.get("as_nummer")),
                    position=item.get("plaatscode_as"),
                    track_cm=integer(item.get("spoorbreedte")),
                    max_mass_kg=integer(item.get("wettelijk_toegestane_maximum_aslast")),
                )
                for item in axes
                if item.get("kenteken") == plate
            ]
            bodies = results[3] if isinstance(results[3], list) else []
            if bodies and bodies[0].get("kenteken") == plate:
                vehicle.body_code = bodies[0].get("carrosserietype")
            statuses = results[4] if isinstance(results[4], list) else []
            vehicle.recall_details_available = isinstance(results[4], list) and len(statuses) < 100
            statuses = [
                s for s in statuses if s.get("kenteken") == plate and s.get("referentiecode_rdw")
            ]
            await asyncio.gather(
                self._odometer(vehicle),
                self._type_approval(vehicle),
                self._recalls(vehicle, statuses),
            )
            return vehicle
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderUnavailable() from exc

    async def _odometer(self, vehicle: Vehicle) -> None:
        if not vehicle.odometer_judgment_code:
            return
        try:
            rows = await self._query(
                "jqs4-4kvw", {"code_toelichting_tellerstandoordeel": vehicle.odometer_judgment_code}
            )
            if rows:
                vehicle.odometer_explanation = rows[0].get("toelichting_tellerstandoordeel")
            vehicle.source.datasets.append("jqs4-4kvw")
        except ProviderUnavailable:
            vehicle.source.warnings.append(
                "De toelichting bij het tellerstandoordeel is tijdelijk niet beschikbaar."
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
            if isinstance(result, BaseException):
                vehicle.source.warnings.append(
                    "Een deel van de typegoedkeuringsgegevens is tijdelijk niet beschikbaar."
                )
                valid.append([])
            else:
                vehicle.source.datasets.append(dataset)
                # Never join only by model name or select an arbitrary approval revision.
                valid.append(
                    [r for r in result if all(r.get(k) == v for k, v in params.items())]
                    if len(result) < 100
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

    async def _recalls(self, vehicle: Vehicle, statuses: list[dict[str, Any]]) -> None:
        async def detail(status: dict[str, Any]) -> Recall:
            reference = str(status["referentiecode_rdw"])
            results = await asyncio.gather(
                self._query("j9yg-7rg9", {"referentiecode_rdw": reference}),
                self._query("9ihi-jgpf", {"referentiecode_rdw": reference}),
                return_exceptions=True,
            )
            for dataset, result in zip(["j9yg-7rg9", "9ihi-jgpf"], results, strict=True):
                if isinstance(result, BaseException):
                    vehicle.source.warnings.append(
                        f"Niet alle details van terugroepactie {reference} konden worden opgehaald."
                    )
                    vehicle.recall_details_available = False
                elif dataset not in vehicle.source.datasets:
                    vehicle.source.datasets.append(dataset)
            rows = results[0] if isinstance(results[0], list) else []
            raw = next((r for r in rows if r.get("referentiecode_rdw") == reference), {})
            risks = results[1] if isinstance(results[1], list) else []
            return Recall(
                reference=reference,
                status_code=status.get("code_status"),
                status=status.get("status"),
                publication_date=source_date(raw.get("publicatiedatum_rdw")),
                producer=raw.get("meldende_producent_distributeur"),
                producer_reference=raw.get("referentiecode_producent"),
                defect=raw.get("omschrijving_defect"),
                consequences=raw.get("materi_le_gevolgen"),
                remedy=raw.get("beschrijving_van_het_herstel"),
                risks=[
                    r["mogelijk_gevaar"]
                    for r in risks
                    if r.get("referentiecode_rdw") == reference and r.get("mogelijk_gevaar")
                ],
                url=raw.get("meer_informatie_op_internet"),
                phone=raw.get("meer_informatie_via_telefoonnummer"),
            )

        # At most 20 campaigns: guard the provider against an unexpectedly large fan-out.
        if len(statuses) > 20:
            vehicle.recall_details_available = False
            vehicle.source.warnings.append(
                "Niet alle terugroepacties worden getoond. Controleer het RDW-register."
            )
        vehicle.recalls = await asyncio.gather(*(detail(s) for s in statuses[:20]))
