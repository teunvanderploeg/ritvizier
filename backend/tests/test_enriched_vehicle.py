import copy
import json
from pathlib import Path

import httpx

from app.providers.rdw import RdwProvider

SNAPSHOT = json.loads(
    (Path(__file__).parent / "fixtures" / "rdw-mini.json").read_text(encoding="utf-8")
)


async def test_mini_exact_approval_and_complete_registration():
    def handler(request):
        dataset = request.url.path.split("/")[-1].replace(".json", "")
        if dataset in {"byxc-wwua", "7rjk-eycs"}:
            assert request.url.params["typegoedkeuringsnummer"] == "e1*2007/46*1682*07"
            assert request.url.params["codevarianttgk"] == "YW31"
            assert request.url.params["codeuitvoeringtgk"] == "DAW500L0"
        return httpx.Response(200, json=SNAPSHOT.get(dataset, []))

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        v = await RdwProvider(client).get_vehicle("G921GS")
    assert (v.color_primary, v.color_secondary) == ("GROEN", "ZWART")
    assert v.version == "DAW500L0"
    assert v.type_approval.transmission == "Automaat"
    assert v.type_approval.gears == 7
    assert v.type_approval.length_mm == 4299
    assert v.odometer_judgment == "Logisch"
    assert v.odometer_explanation and "steeds hoger" in v.odometer_explanation
    assert v.registration_date == "2021-02-11"
    assert v.wam_insured is True
    assert v.consumption_wltp == 6.9 and v.consumption_combined == 5.4
    assert v.emissions_co2_wltp == 157 and v.emissions_co2_nedc == 122
    assert [a.track_cm for a in v.axes] == [159, 159]
    assert v.recalls == [] and v.recall_details_available


async def test_ambiguous_type_approval_never_selects_arbitrary_revision():
    records = copy.deepcopy(SNAPSHOT)
    alternative = {
        **records["7rjk-eycs"][0],
        "aantalversnellingenondergrens": "8",
        "aantalversnellingenbovengrens": "8",
    }
    records["7rjk-eycs"].append(alternative)
    records["byxc-wwua"][0]["codeuitvoeringtgk"] = "OTHER"
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, json=records.get(r.url.path.split("/")[-1][:-5], []))
        )
    ) as client:
        v = await RdwProvider(client).get_vehicle("G921GS")
    assert v.type_approval.gears is None
    assert v.type_approval.length_mm is None


async def test_recall_join_keeps_open_and_repaired_statuses_and_failure_is_partial():
    records = copy.deepcopy(SNAPSHOT)
    records["m9d7-ebf2"][0]["openstaande_terugroepactie_indicator"] = "Ja"
    records["t49b-isb7"] = [
        {
            "kenteken": "G921GS",
            "referentiecode_rdw": "TEST-O",
            "code_status": "O",
            "status": "Openstaande terugroepactie",
        },
        {
            "kenteken": "G921GS",
            "referentiecode_rdw": "TEST-P",
            "code_status": "P",
            "status": "Producent heeft herstel gemeld",
        },
    ]

    def handler(request):
        dataset = request.url.path.split("/")[-1][:-5]
        ref = request.url.params.get("referentiecode_rdw")
        if dataset == "j9yg-7rg9":
            return httpx.Response(
                200,
                json=[
                    {
                        "referentiecode_rdw": ref,
                        "omschrijving_defect": "Testdefect",
                        "beschrijving_van_het_herstel": "Testherstel",
                        "publicatiedatum_rdw": "20260115",
                    }
                ],
            )
        if dataset == "9ihi-jgpf":
            return (
                httpx.Response(503)
                if ref == "TEST-P"
                else httpx.Response(
                    200, json=[{"referentiecode_rdw": ref, "mogelijk_gevaar": "Testgevaar"}]
                )
            )
        return httpx.Response(200, json=records.get(dataset, []))

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        v = await RdwProvider(client).get_vehicle("G921GS")
    assert v.recall_pending is True
    assert [(r.reference, r.status_code) for r in v.recalls] == [("TEST-O", "O"), ("TEST-P", "P")]
    assert v.recalls[0].defect == "Testdefect" and v.recalls[0].remedy == "Testherstel"
    assert v.recalls[0].risks == ["Testgevaar"]
    assert v.recalls[0].publication_date == "2026-01-15"
    assert not v.recall_details_available and v.source.warnings
