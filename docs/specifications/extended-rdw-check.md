# Implementatiespecificatie: uitgebreide gratis kentekencheck met RDW Open Data

> **Doel van dit bestand**
>
> Dit bestand is bedoeld om rechtstreeks aan een coding-agent / ChatGPT te geven die een bestaande kentekencheck-website moet uitbreiden.
>
> **Opdracht aan de coding-agent:** analyseer eerst de bestaande codebase en architectuur. Implementeer daarna onderstaande functionaliteit passend binnen de bestaande stack. Vervang bestaande werkende functionaliteit niet onnodig en voorkom duplicatie. Alle RDW-calls moeten via de backend lopen en niet rechtstreeks vanuit de browser.

---

# 1. Doel

Bouw van de bestaande kentekencheck een zo compleet mogelijke gratis voertuigcheck door meerdere officiële RDW Open Data-datasets te combineren.

De applicatie moet minimaal kunnen tonen:

- algemene voertuiggegevens;
- registratiegegevens;
- APK-status;
- APK-/gebrekenhistorie;
- tellerstandoordeel;
- importindicatie;
- verzekeringsstatus voor zover openbaar;
- openstaande terugroepactie-indicator;
- mogelijke recall-details;
- brandstofgegevens;
- vermogen;
- emissiegegevens;
- verbruik;
- carrosseriegegevens;
- as- en gewichtsinformatie;
- trekgewicht;
- afmetingen;
- catalogusprijs en BPM;
- voertuigklasse;
- slimme afgeleide inzichten en waarschuwingen.

De gebruiker voert alleen een Nederlands kenteken in.

---

# 2. Belangrijke uitgangspunten

## 2.1 Gebruik officiële RDW-datasets als primaire bron

Gebruik waar mogelijk alleen datasets die daadwerkelijk door RDW worden beheerd.

Vermijd community-created views wanneer dezelfde informatie via de originele dataset beschikbaar is.

## 2.2 Centrale join key

De primaire join key is:

```text
kenteken
```

Normaliseer ieder kenteken vóór elke query:

```python
kenteken = kenteken.upper().replace("-", "").replace(" ", "")
```

Voorbeeld:

```text
12-ABC-3
12 abc 3
12ABC3
```

worden allemaal:

```text
12ABC3
```

## 2.3 RDW gebruikt Socrata / SODA

REST-endpoint:

```text
https://opendata.rdw.nl/resource/{DATASET_ID}.json
```

Filtervoorbeeld:

```text
https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=12ABC3
```

Gebruik URL-encoding via de HTTP-library en bouw querystrings niet handmatig.

## 2.4 Backend only

De frontend mag RDW niet rechtstreeks aanroepen.

Gebruik:

```text
Browser
   ↓
eigen backend
   ↓
RDW Open Data
   ↓
normalisatie / analyse
   ↓
cache
   ↓
frontend
```

Voordelen:

- caching;
- consistente response;
- foutafhandeling;
- bescherming tegen misbruik;
- eenvoudiger wisselen van databron;
- geen afhankelijkheid van RDW-veldnamen in frontend.

---

# 3. RDW datasets

## 3.1 Hoofddataset — Gekentekende voertuigen

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen
```

**Dataset ID**

```text
m9d7-ebf2
```

**API**

```text
https://opendata.rdw.nl/resource/m9d7-ebf2.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken={KENTEKEN}
```

Dit is de belangrijkste dataset en moet altijd als eerste worden opgehaald.

De dataset bevat ongeveer honderd voertuigvelden, waaronder afhankelijk van het voertuig:

- kenteken;
- voertuigsoort;
- merk;
- handelsbenaming;
- type;
- variant;
- uitvoering;
- inrichting;
- eerste kleur;
- tweede kleur;
- aantal cilinders;
- cilinderinhoud;
- massa ledig voertuig;
- massa rijklaar;
- toegestane maximum massa voertuig;
- technische maximum massa voertuig;
- laadvermogen;
- aantal zitplaatsen;
- aantal deuren;
- aantal wielen;
- lengte;
- breedte;
- wielbasis;
- datum eerste toelating;
- datum eerste tenaamstelling Nederland;
- datum tenaamstelling;
- vervaldatum APK;
- bruto BPM;
- catalogusprijs;
- Europese voertuigcategorie;
- export indicator;
- WAM verzekerd;
- openstaande terugroepactie indicator;
- taxi indicator;
- tellerstandoordeel;
- code toelichting tellerstandoordeel;
- tenaamstellen mogelijk;
- maximum massa samenstelling;
- verschillende koppeling-/trek- en massavelden.

De hoofddataset bevat bovendien API-verwijzingen naar andere RDW-datasets, waaronder:

```text
api_gekentekende_voertuigen_assen
api_gekentekende_voertuigen_brandstof
api_gekentekende_voertuigen_carrosserie
api_gekentekende_voertuigen_carrosserie_specifiek
api_gekentekende_voertuigen_voertuigklasse
```

Gebruik in de implementatie bij voorkeur vaste dataset-ID's in configuratie in plaats van blind de URL's uit iedere response te volgen.

---

# 3.2 Brandstof- en emissiegegevens

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen_brandstof
```

**Dataset ID**

```text
8ys7-d773
```

**API**

```text
https://opendata.rdw.nl/resource/8ys7-d773.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken={KENTEKEN}
```

Let op: één voertuig kan meerdere regels hebben, bijvoorbeeld bij:

- hybride;
- benzine + LPG;
- PHEV;
- andere meervoudige brandstofregistraties.

Behandel dit dus als:

```typescript
fuel: FuelRecord[]
```

en niet als één object.

Gebruik indien aanwezig onder andere:

- brandstof volgnummer;
- brandstof omschrijving;
- emissiecode / emissieklasse;
- nettomaximumvermogen;
- nominaal continu maximumvermogen;
- brandstofverbruik gecombineerd;
- brandstofverbruik stad;
- brandstofverbruik buitenweg;
- CO2 uitstoot gecombineerd;
- CO2 uitstoot gewogen;
- emissie deeltjes;
- NOx;
- andere emissievelden;
- elektrische relevante waarden indien aanwezig.

### Vermogen omrekenen

Indien RDW kW levert:

```text
pk = kW × 1.35962
```

Afronden:

```text
110 kW → 150 pk
```

Sla altijd zowel kW als pk op.

---

# 3.3 Carrosserie

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen_carrosserie
```

**Dataset ID**

```text
vezc-m2t6
```

**API**

```text
https://opendata.rdw.nl/resource/vezc-m2t6.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/vezc-m2t6.json?kenteken={KENTEKEN}
```

Gebruik om carrosserietype(n) te tonen.

Behandel meerdere records correct.

---

# 3.4 Carrosseriespecificatie

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen_carrosserie_specificatie
```

**Dataset ID**

```text
jhie-znh9
```

**API**

```text
https://opendata.rdw.nl/resource/jhie-znh9.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/jhie-znh9.json?kenteken={KENTEKEN}
```

Belangrijke velden:

```text
kenteken
carrosserie_volgnummer
carrosserie_voertuig_nummer_code_volgnummer
carrosseriecode
carrosserie_voertuig_nummer_europese_omschrijving
```

Gebruik deze informatie als verdieping naast het normale carrosserietype.

---

# 3.5 Assen

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen_assen
```

**Dataset ID**

```text
3huj-srit
```

**API**

```text
https://opendata.rdw.nl/resource/3huj-srit.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/3huj-srit.json?kenteken={KENTEKEN}
```

Een voertuig kan meerdere assen hebben.

Response daarom modelleren als:

```typescript
axles: Axle[]
```

Gebruik onder andere:

- asnummer;
- technisch toegestane maximum aslast;
- wettelijk toegestane maximum aslast;
- aangedreven as;
- hefbare as;
- gestuurde as;
- spoorbreedte;
- relevante as-specificaties.

Voor personenauto's kan dit onder een uitklapbaar blok **Technische details**.

---

# 3.6 Voertuigklasse

**Dataset**

```text
Open Data RDW: Gekentekende_voertuigen_voertuigklasse
```

**Dataset ID**

```text
kmfi-hrps
```

**API**

```text
https://opendata.rdw.nl/resource/kmfi-hrps.json
```

**Query**

```http
GET https://opendata.rdw.nl/resource/kmfi-hrps.json?kenteken={KENTEKEN}
```

Gebruik dit als aanvullende voertuigclassificatie.

---

# 4. APK-historie — belangrijke uitbreiding

RDW heeft aparte open datasets voor voertuigkeuringen.

Dit maakt het mogelijk om gratis een APK-/gebrekenhistorie te bouwen.

---

# 4.1 Meldingen Keuringsinstantie

**Dataset**

```text
Open Data RDW: Meldingen Keuringsinstantie
```

**Dataset ID**

```text
sgfe-77wx
```

**API**

```text
https://opendata.rdw.nl/resource/sgfe-77wx.json
```

Probeer per kenteken:

```http
GET https://opendata.rdw.nl/resource/sgfe-77wx.json?kenteken={KENTEKEN}
```

Gebruik de beschikbare records voor een chronologische keuringstijdlijn.

De exacte set velden kan door RDW wijzigen. Maak daarom de parser defensief:

```python
record.get("field_name")
```

in plaats van aan te nemen dat ieder veld altijd aanwezig is.

Sorteer historische gebeurtenissen aflopend op keurings-/meldingsdatum.

---

# 4.2 Geconstateerde Gebreken

**Dataset**

```text
Open Data RDW: Geconstateerde Gebreken
```

**Dataset ID**

```text
a34c-vvps
```

**API**

```text
https://opendata.rdw.nl/resource/a34c-vvps.json
```

Query:

```http
GET https://opendata.rdw.nl/resource/a34c-vvps.json?kenteken={KENTEKEN}
```

Deze dataset kan per keuring één of meerdere geconstateerde gebrekcodes bevatten.

Gebruik dit om bijvoorbeeld te tonen:

```text
APK-historie

18-07-2026
- Band/profieldiepte aandachtspunt
- Verlichting defect

12-07-2025
- Remonderdeel
```

Gebruik nooit alleen de ruwe gebrekcode in de UI als er een officiële omschrijving beschikbaar is.

---

# 4.3 Gebrekcode-referentietabel

**Dataset**

```text
Open Data RDW: Gebreken
```

**Dataset ID**

```text
hx2c-gt7k
```

**API**

```text
https://opendata.rdw.nl/resource/hx2c-gt7k.json
```

Dit is primair een referentietabel.

Gebruik deze dataset om:

```text
gebrekcode
```

te vertalen naar:

```text
leesbare officiële omschrijving
```

### Aanpak

Deze referentiedataset hoeft niet bij iedere kentekencheck opnieuw volledig te worden opgehaald.

Sla de mapping lokaal op in:

- application cache;
- Redis;
- database;
- of een periodiek ververste in-memory map.

Voorbeeld intern:

```json
{
  "code": "....",
  "description": "...."
}
```

### Join

Conceptueel:

```text
Geconstateerde Gebreken
        │
        └── gebrekcode
               │
               ▼
        Gebreken referentie
               │
               ▼
       leesbare omschrijving
```

---

# 4.4 APK-analyse

Maak bovenop de ruwe historie eigen inzichten.

Voorbeelden:

```text
Aantal geregistreerde keuringsmomenten: 4
Aantal momenten met geregistreerde gebreken: 3
Totaal geregistreerde gebreken: 7
```

Detecteer terugkerende problemen door gebrekcodes/onderdelen over verschillende jaren te groeperen.

Voorbeeld:

```text
⚠ Remgerelateerde opmerkingen kwamen bij 2 verschillende keuringen terug.
```

Gebruik hiervoor een neutrale formulering.

Zeg NIET:

```text
Deze auto heeft slechte remmen.
```

Een APK-historie is historische informatie, geen actuele technische keuring.

---

# 5. Tellerstand

De hoofddataset bevat onder andere:

```text
tellerstandoordeel
code_toelichting_tellerstandoordeel
jaar_laatste_registratie_tellerstand
```

indien van toepassing.

Toon minimaal:

```text
Tellerstand
✓ Logisch
```

of:

```text
Tellerstand
⚠ Onlogisch
```

of:

```text
Tellerstand
Geen oordeel
```

of:

```text
Tellerstand
Niet geregistreerd
```

## Belangrijk

De open dataset geeft niet automatisch een complete chronologische lijst van alle historische kilometerstanden.

Claim dus niet dat wij de volledige NAP-historie hebben wanneer die niet uit de response beschikbaar is.

### Optionele gebruikersinput

Laat een gebruiker zijn actuele kilometerstand invoeren:

```text
Huidige kilometerstand: 128.400 km
```

Daarmee kunnen aanvullende berekeningen worden gemaakt:

```text
kilometers per jaar ≈ huidige kilometerstand / voertuigleeftijd
```

Label dit duidelijk als berekening.

---

# 6. Importdetectie

Gebruik:

```text
datum_eerste_toelating
datum_eerste_tenaamstelling_in_nederland
```

Als:

```text
datum_eerste_tenaamstelling_in_nederland > datum_eerste_toelating
```

dan is dit een sterke indicatie dat het voertuig later in Nederland is geregistreerd.

Bereken:

```text
import_age_days =
datum_eerste_tenaamstelling_in_nederland
-
datum_eerste_toelating
```

UI:

```text
Import
Ja, waarschijnlijk geïmporteerd

Eerste toelating:
14-03-2018

Eerste registratie Nederland:
21-09-2021

Leeftijd bij NL-registratie:
± 3 jaar en 6 maanden
```

Gebruik **waarschijnlijk geïmporteerd** wanneer de bron geen expliciet importveld teruggeeft.

---

# 7. Registratie en voertuigstatus

Uit de hoofddataset kunnen onder andere deze signalen komen:

```text
export_indicator
wam_verzekerd
openstaande_terugroepactie_indicator
taxi_indicator
tenaamstellen_mogelijk
wacht_op_keuren
```

Gebruik deze in een statusblok.

Voorbeeld:

```text
Voertuigstatus

✓ Tenaamstellen mogelijk
✓ Geen exportindicator
✓ Geen openstaande terugroepactie
✓ WAM-status: verzekerd
```

Toon `Geen verstrekking in Open Data` als **onbekend / niet openbaar**, niet als `Nee`.

---

# 8. Recalls / terugroepacties

Gebruik twee lagen.

## Laag 1 — exacte indicator per kenteken

De hoofddataset bevat:

```text
openstaande_terugroepactie_indicator
```

Dit is de primaire indicator voor het specifieke kenteken.

Toon:

```text
Openstaande terugroepactie: Ja
```

of:

```text
Openstaande terugroepactie: Nee
```

---

# 8.1 Recall-hoofdtabel

**Dataset**

```text
Open Data RDW: Terugroep_actie
```

**Dataset ID**

```text
j9yg-7rg9
```

**API**

```text
https://opendata.rdw.nl/resource/j9yg-7rg9.json
```

Bevat onder andere:

```text
referentiecode_rdw
publicatiedatum_rdw
meldende_producent_distributeur
referentiecode_producent
omschrijving_defect
```

en andere recall-details.

---

# 8.2 Recall-risico

**Dataset**

```text
Open Data RDW: Terugroep_actie_risico
```

**Dataset ID**

```text
9ihi-jgpf
```

**API**

```text
https://opendata.rdw.nl/resource/9ihi-jgpf.json
```

Join:

```text
referentiecode_rdw
```

Belangrijke velden:

```text
code_mogelijk_gevaar
mogelijk_gevaar
```

Voorbeelden van risicocodes kunnen betrekking hebben op:

- ongeval/letsel;
- verhoogde kans op letsel;
- brand;
- milieu.

Toon vooral de leesbare omschrijving, niet alleen de code.

---

# 8.3 Recall merk/type mapping

**Dataset**

```text
Open Data RDW: Terugroep_voertuig_merk_type
```

**Dataset ID**

```text
mu2x-mu5e
```

**API**

```text
https://opendata.rdw.nl/resource/mu2x-mu5e.json
```

Belangrijke velden:

```text
referentiecode_rdw
merk
type
```

Hiermee kunnen recall-acties aan merk/type worden gekoppeld.

### ZEER BELANGRIJK

Een match op alleen merk + type is niet voldoende om te zeggen:

```text
"Deze specifieke auto valt zeker onder recall X."
```

Gebruik daarom:

- `openstaande_terugroepactie_indicator` als primaire kenteken-specifieke waarheid;
- merk/type recall-data als aanvullende context / mogelijke relevante recalls.

UI bijvoorbeeld:

```text
Openstaande terugroepactie
JA

Mogelijk relevante geregistreerde acties voor dit merk/type:
- MGP....
- ...
```

Vermeld dat exacte uitvoering/productieperiode bepalend kan zijn.

---

# 9. Waarde-informatie

RDW bevat geen betrouwbare actuele verkoopwaarde per auto.

Wat wel beschikbaar is:

```text
catalogusprijs
bruto_bpm
```

Toon bijvoorbeeld:

```text
Oorspronkelijke catalogusprijs: €41.995
Bruto BPM: €6.212
```

Noem dit nooit:

```text
huidige marktwaarde
```

---

# 10. Gratis geschatte marktwaarde — eigen model

Een actuele waarde kan later zelf worden geschat.

Maak hiervoor architectuur klaar, maar zorg dat deze component losstaat van RDW.

Interface:

```typescript
interface ValuationInput {
    make: string
    model: string
    firstRegistration: Date
    fuel: string[]
    powerKw?: number
    powerHp?: number
    mileage?: number
    bodyType?: string
    transmission?: string
}
```

Response:

```typescript
interface ValuationResult {
    low?: number
    estimate?: number
    high?: number
    confidence?: number
    sampleSize?: number
    source: "market-model"
}
```

Zonder echte marktdata mag de applicatie geen verzonnen bedrag tonen.

---

# 11. Vorige eigenaren

## Niet uit RDW Open Data afleiden zonder bron

De openbare kenteken-datasets bevatten onder andere:

```text
datum_tenaamstelling
datum_eerste_tenaamstelling_in_nederland
```

maar dit is **geen volledige eigenarenhistorie**.

Gebruik deze data dus NIET om bijvoorbeeld te claimen:

```text
"4 vorige eigenaren"
```

tenzij een officiële gebruikte bron expliciet dat aantal levert.

Wat wel kan:

```text
Laatste tenaamstelling: 16-04-2025
Huidige tenaamstellingsduur: 1 jaar en 6 maanden
```

Hierbij wordt geen identiteit van een eigenaar getoond.

Persoonsnamen/adressen van eigenaren horen sowieso niet in deze applicatie.

---

# 12. Schadeverleden

RDW Open Data bevat geen complete database van verzekeringsclaims/schades per kenteken.

Noem APK-gebreken dus nooit simpelweg:

```text
schadehistorie
```

Maak een apart blok:

```text
APK- en technische historie
```

Je mag op basis van beschikbare open data wel signalen tonen zoals:

- terugkerende carrosseriegebreken;
- terugkerende onderstelproblemen;
- verlichting;
- banden;
- remgerelateerde gebreken;
- registratie-/importinformatie;
- wacht-op-keuren/status;
- openstaande recall.

Maar:

```text
Geen APK-gebreken gevonden
```

mag niet worden vertaald naar:

```text
Nooit schade gehad
```

---

# 13. Afgeleide gegevens

Bouw een aparte analyse/service-laag.

Bijvoorbeeld:

```text
VehicleDataService
       ↓
VehicleAnalysisService
```

De analyse mag geen externe API-calls doen. Hij werkt alleen met genormaliseerde data.

---

# 13.1 Voertuigleeftijd

Bereken vanuit:

```text
datum_eerste_toelating
```

Resultaat:

```text
8 jaar en 4 maanden
```

---

# 13.2 APK countdown

Bereken:

```text
vervaldatum_apk - vandaag
```

Status:

```text
> 60 dagen       geldig
31–60 dagen      binnenkort
1–30 dagen       verloopt binnenkort
< 0              verlopen
```

Maak grenzen configureerbaar.

---

# 13.3 pk

```text
pk = kW * 1.35962
```

---

# 13.4 Vermogen/gewicht

Indien gewicht bekend:

```text
pk_per_1000kg = pk / gewicht_kg * 1000
```

Voorbeeld:

```text
150 pk
1.250 kg
= 120 pk/ton
```

---

# 13.5 Laadvermogen

Gebruik bij voorkeur het officiële RDW-veld wanneer beschikbaar.

Alleen als nodig afleiden:

```text
toegestane maximum massa - massa rijklaar
```

Label afgeleide waarden intern:

```text
derived: true
```

---

# 13.6 Afmetingen leesbaar maken

RDW-waarden kunnen in cm/mm-eenheden volgens de metadata staan.

Controleer de metadata en converteer alleen wanneer de eenheid zeker is.

Frontend:

```text
Lengte: 4,28 m
Breedte: 1,79 m
Wielbasis: 2,62 m
```

Sla de originele RDW-waarde eveneens op.

---

# 13.7 Importleeftijd

```text
registrationNL - firstAdmission
```

Toon alleen wanneer verschil betekenisvol is.

---

# 13.8 Tenaamstellingsduur

```text
vandaag - datum_tenaamstelling
```

Voorbeeld:

```text
Laatste tenaamstelling 43 dagen geleden.
```

Een korte tenaamstellingsduur is hoogstens een aandachtspunt, geen bewijs van een probleem.

---

# 13.9 Technische historie-score

Optioneel.

Maak géén misleidende objectieve "RDW score".

Als een score gewenst is, noem hem bijvoorbeeld:

```text
Kentekencheck aandachtsscore
```

en maak transparant waarop hij gebaseerd is.

Voorbeeld:

```text
APK verlopen              +30 risicopunten
Tellerstand onlogisch     +30
Open recall               +15
Recent importvoertuig     +5
Herhaald APK-gebrek       +5 per categorie
Niet tenaamstelbaar       +25
```

Lager = minder aandachtspunten.

Toon altijd de onderliggende redenen.

---

# 14. Genormaliseerd datamodel

De rest van de applicatie mag niet direct afhankelijk zijn van RDW API-veldnamen.

Maak een genormaliseerd model.

Voorbeeld:

```json
{
  "licensePlate": "12ABC3",
  "vehicle": {
    "make": "VOLKSWAGEN",
    "model": "GOLF",
    "type": null,
    "vehicleType": "Personenauto",
    "body": [],
    "colorPrimary": "ZWART",
    "colorSecondary": null,
    "seats": 5,
    "doors": 5,
    "wheels": 4
  },
  "registration": {
    "firstAdmission": "2019-03-14",
    "firstRegistrationNL": "2021-09-21",
    "lastRegistration": "2025-04-16",
    "likelyImported": true,
    "exported": false,
    "canTransfer": true,
    "insuredWam": true,
    "taxi": false
  },
  "apk": {
    "expiresAt": "2027-03-14",
    "status": "valid",
    "daysRemaining": 158,
    "inspections": [],
    "defects": []
  },
  "mileage": {
    "judgement": "Logisch",
    "judgementCode": null,
    "lastRegistrationYear": 2026
  },
  "engine": {
    "cylinders": 4,
    "displacementCc": 1498,
    "fuels": [],
    "powerKw": 110,
    "powerHp": 150
  },
  "emissions": {
    "co2Combined": null,
    "co2Weighted": null,
    "emissionClass": null
  },
  "dimensions": {
    "length": null,
    "width": null,
    "wheelbase": null
  },
  "weights": {
    "emptyKg": null,
    "curbKg": null,
    "maxAllowedKg": null,
    "maxTechnicalKg": null,
    "payloadKg": null,
    "maxCombinationKg": null
  },
  "pricing": {
    "catalogPrice": null,
    "grossBpm": null
  },
  "recalls": {
    "hasOpenRecall": false,
    "possibleRelevantActions": []
  },
  "axles": [],
  "vehicleClasses": [],
  "analysis": {
    "warnings": [],
    "facts": []
  },
  "meta": {
    "source": "RDW Open Data",
    "retrievedAt": "ISO-8601"
  }
}
```

Pas property names aan aan de bestaande codebase.

---

# 15. API van onze eigen applicatie

Voeg één gecombineerde endpoint toe:

```http
GET /api/vehicles/{kenteken}
```

Optioneel:

```http
GET /api/vehicles/{kenteken}/apk-history
GET /api/vehicles/{kenteken}/recalls
```

Maar de frontend moet in de normale kentekenpagina bij voorkeur met één aggregate-response kunnen werken.

---

# 16. Parallelle datafetch

Na een succesvolle hoofddataset-query kunnen onafhankelijke RDW-calls parallel worden uitgevoerd.

Pseudo-code:

```python
vehicle = await fetch_vehicle(kenteken)

if not vehicle:
    raise VehicleNotFound()

fuel, bodies, body_specs, axles, classes, inspections, defects = await gather(
    fetch_fuel(kenteken),
    fetch_body(kenteken),
    fetch_body_specs(kenteken),
    fetch_axles(kenteken),
    fetch_vehicle_classes(kenteken),
    fetch_inspections(kenteken),
    fetch_defects(kenteken),
)
```

Daarna:

```python
normalized = normalize(...)
analysis = analyze(normalized)
return merge(normalized, analysis)
```

Recall-detailqueries mogen daarna op basis van merk/type worden gedaan.

---

# 17. Timeouts en foutafhandeling

Eén ontbrekende secundaire dataset mag de hele kentekencheck niet breken.

Voorbeeld:

```text
Hoofddataset OK
Brandstof OK
Assen timeout
APK historie OK
```

Resultaat:

```text
HTTP 200
```

met:

```json
{
  "partial": true,
  "unavailableSections": ["axles"]
}
```

Alleen als de hoofddataset faalt, kan de gehele request mislukken.

Maak onderscheid tussen:

```text
400 invalid_plate
404 vehicle_not_found
429 upstream_rate_limited
502 rdw_unavailable
504 rdw_timeout
```

---

# 18. Caching

Aanbevolen TTL's:

```text
hoofddataset           24 uur
brandstof              7 dagen
carrosserie            30 dagen
assen                   30 dagen
voertuigklasse         30 dagen
APK historie            24 uur
recall indicator        24 uur
recall referentiedata   24 uur
gebrekcode mapping       7 dagen
```

Gebruik bestaande cache-infrastructuur.

Indien Redis aanwezig is:

```text
rdw:vehicle:{plate}
rdw:fuel:{plate}
rdw:apk:{plate}
rdw:defects:{plate}
```

---

# 19. RDW app token

Socrata ondersteunt een application token.

Gebruik indien beschikbaar:

```http
X-App-Token: {TOKEN}
```

Zet dit in environment variables:

```env
RDW_APP_TOKEN=
```

De applicatie moet ook zonder token kunnen functioneren wanneer de API dat toestaat.

Token nooit naar de frontend sturen.

---

# 20. Rate limiting eigen API

Voorkom dat gebruikers jouw server als onbeperkte RDW proxy gebruiken.

Bijvoorbeeld:

```text
30 kentekenchecks/minuut/IP
```

Pas dit aan op bestaande infrastructuur.

Cache-hits moeten waar mogelijk geen nieuwe RDW-call veroorzaken.

---

# 21. UI-indeling

Aanbevolen voertuigpagina:

```text
┌────────────────────────────────────┐
│ MERK MODEL                         │
│ 12-ABC-3                           │
│ 2019 · Benzine · 150 pk            │
└────────────────────────────────────┘

Snelle status
─────────────────────────────────────
✓ APK geldig
✓ Tellerstand logisch
⚠ Importvoertuig
✓ Geen openstaande recall

Aandachtspunten
─────────────────────────────────────

Voertuig
─────────────────────────────────────

Registratie & historie
─────────────────────────────────────

APK-historie
─────────────────────────────────────

Motor & brandstof
─────────────────────────────────────

Verbruik & emissies
─────────────────────────────────────

Gewicht & trekgewicht
─────────────────────────────────────

Afmetingen
─────────────────────────────────────

Carrosserie
─────────────────────────────────────

Technische details / assen
─────────────────────────────────────

Recalls
─────────────────────────────────────

Catalogusprijs & BPM
─────────────────────────────────────
```

Maak niet-beschikbare secties liever onzichtbaar dan vol te zetten met `Onbekend`.

---

# 22. APK-historie UI

Groeperen per keuringsdatum.

Voorbeeld:

```text
APK-historie

18 juli 2026
2 geregistreerde aandachtspunten
  • ...
  • ...

3 juli 2025
1 geregistreerd aandachtspunt
  • ...

2024
Geen geregistreerde gebreken gevonden in de beschikbare open data
```

Let op:

Een ontbrekend gebrekrecord bewijst niet automatisch dat een volledig probleemloze keuring heeft plaatsgevonden.

Gebruik de keuringsmeldingen-dataset om waar mogelijk echte keuringsmomenten te bepalen.

---

# 23. Waarschuwingsregels

Implementeer ten minste:

```text
APK_EXPIRED
APK_EXPIRING_SOON
MILEAGE_JUDGEMENT_ILLOGICAL
MILEAGE_NO_JUDGEMENT
LIKELY_IMPORTED
OPEN_RECALL
NOT_TRANSFERABLE
EXPORTED
WAITING_FOR_INSPECTION
REPEATED_APK_DEFECT
RECENT_REGISTRATION_CHANGE
```

Voorbeeld-object:

```json
{
  "code": "OPEN_RECALL",
  "severity": "warning",
  "title": "Openstaande terugroepactie",
  "description": "Voor dit kenteken staat een terugroepactie-indicator geregistreerd."
}
```

Severity:

```text
info
warning
critical
```

Gebruik `critical` terughoudend.

---

# 24. Geen onjuiste conclusies

De applicatie mag NIET automatisch zeggen:

```text
Geen schade gehad
```

op basis van RDW Open Data.

De applicatie mag NIET zeggen:

```text
Kilometerstand is 128.000 km
```

als alleen het tellerstandoordeel bekend is.

De applicatie mag NIET zeggen:

```text
4 vorige eigenaren
```

zonder databron die expliciet het aantal eigenaren levert.

De applicatie mag NIET zeggen:

```text
Deze auto heeft recall X
```

puur op basis van merk/type matching.

De applicatie mag NIET zeggen:

```text
Waarde €18.500
```

zonder een echte waarderingsbron/model.

---

# 25. Data provenance

Bewaar intern per sectie de bron.

Bijvoorbeeld:

```json
{
  "value": "Logisch",
  "source": {
    "provider": "RDW Open Data",
    "dataset": "m9d7-ebf2"
  }
}
```

Dit hoeft niet overal letterlijk in de frontend getoond te worden, maar is zeer nuttig voor debugging.

---

# 26. Tests

Maak unit/integratietests voor minimaal:

### Kenteken normalisatie

```text
12-ABC-3 → 12ABC3
12 abc 3 → 12ABC3
```

### Datum parsing

RDW gebruikt onder andere numerieke datumstrings:

```text
20261007
```

Converteer naar echte datumobjecten.

### Lege velden

Ontbrekende velden mogen geen exception veroorzaken.

### Meerdere brandstoffen

Test PHEV/bi-fuel response.

### Meerdere assen

Test arrays.

### Importdetectie

```text
firstAdmission != firstRegistrationNL
```

### APK

- geldig;
- binnenkort;
- verlopen;
- geen APK-datum.

### Tellerstand

- logisch;
- onlogisch;
- geen oordeel;
- niet geregistreerd.

### Partial upstream failure

Secundaire RDW-call faalt maar basispagina blijft werken.

---

# 27. Performance

Doel voor gecachte kentekencheck:

```text
< 300 ms backend response
```

Voor uncached multi-source request:

- calls parallel uitvoeren;
- timeout per upstream;
- geen sequentiële waterfall;
- referentiedatasets lokaal cachen.

---

# 28. Security

Valideer `kenteken` strikt voordat het in een query terechtkomt.

Sta alleen toe:

```regex
^[A-Z0-9]{4,8}$
```

na normalisatie, of gebruik een specifiekere Nederlandse kentekenvalidator als die al in de applicatie aanwezig is.

Gebruik geen willekeurige user input als:

```text
$select
$where
$order
```

in een Socrata-query.

Voorkom dat de API een generieke open proxy naar:

```text
opendata.rdw.nl
```

wordt.

---

# 29. Privacy

Bewaar geen onnodige gebruikersidentiteit bij kentekenchecks.

Als zoekgeschiedenis wordt opgeslagen:

- bij voorkeur client-side;
- of expliciet binnen een gebruikersaccount;
- met verwijdermogelijkheid.

Eigenaarspersoonsgegevens zijn buiten scope.

---

# 30. Belangrijk juridisch/datagebruik-punt

RDW Open Data is gratis beschikbaar en de datasets vallen onder CC0.

De RDW-bijsluiter vermeldt daarnaast fair use en geeft aan geen garantie op beschikbaarheid/actualiteit van het platform te geven.

Controleer vóór productie de actuele RDW Open Data-bijsluiter.

Bron:

```text
https://www.rdw.nl/over-rdw/dienstverlening/open-data/bijsluiter
```

Let op de actuele voorwaarden rond bronvermelding/gebruik van RDW-naam, logo en huisstijl. Neem de tekst uit de actuele bijsluiter als leidend en verzin geen officiële RDW-affiliatie.

---

# 31. Bronlinks / datasetregister

## Voertuigen

```text
Hoofddataset:
https://opendata.rdw.nl/Voertuigen/Open-Data-RDW-Gekentekende_voertuigen/m9d7-ebf2

API:
https://opendata.rdw.nl/resource/m9d7-ebf2.json
```

```text
Brandstof:
https://opendata.rdw.nl/resource/8ys7-d773.json
```

```text
Carrosserie:
https://opendata.rdw.nl/resource/vezc-m2t6.json
```

```text
Carrosserie specificatie:
https://opendata.rdw.nl/Voertuigen/Open-Data-RDW-Gekentekende_voertuigen_carrosserie_/jhie-znh9
https://opendata.rdw.nl/resource/jhie-znh9.json
```

```text
Assen:
https://opendata.rdw.nl/resource/3huj-srit.json
```

```text
Voertuigklasse:
https://opendata.rdw.nl/resource/kmfi-hrps.json
```

## Keuringen

```text
Meldingen Keuringsinstantie:
https://opendata.rdw.nl/Keuringen/Open-Data-RDW-Meldingen-Keuringsinstantie/sgfe-77wx
https://opendata.rdw.nl/resource/sgfe-77wx.json
```

```text
Geconstateerde Gebreken:
https://opendata.rdw.nl/Keuringen/Open-Data-RDW-Geconstateerde-Gebreken/a34c-vvps
https://opendata.rdw.nl/resource/a34c-vvps.json
```

```text
Gebreken referentie:
https://opendata.rdw.nl/Keuringen/Open-Data-RDW-Gebreken/hx2c-gt7k
https://opendata.rdw.nl/resource/hx2c-gt7k.json
```

## Recalls

```text
Terugroepactie:
https://opendata.rdw.nl/resource/j9yg-7rg9.json
```

```text
Recall risico:
https://opendata.rdw.nl/resource/9ihi-jgpf.json
```

```text
Recall merk/type:
https://opendata.rdw.nl/resource/mu2x-mu5e.json
```

## Socrata-documentatie

```text
https://dev.socrata.com/
https://dev.socrata.com/docs/app-tokens
```

---

# 32. Aanbevolen implementatievolgorde

## Fase 1 — bestaande kentekencheck uitbreiden

- [ ] Kenteken normaliseren
- [ ] `m9d7-ebf2` volledig benutten
- [ ] response normaliseren
- [ ] voertuigstatus
- [ ] tellerstandoordeel
- [ ] APK-status
- [ ] importdetectie
- [ ] catalogusprijs/BPM
- [ ] WAM/export/recall/tenaamstelling indicators

## Fase 2 — technische datasets

- [ ] `8ys7-d773` brandstof
- [ ] kW → pk
- [ ] emissies
- [ ] verbruik
- [ ] `vezc-m2t6` carrosserie
- [ ] `jhie-znh9` carrosseriespecificatie
- [ ] `3huj-srit` assen
- [ ] `kmfi-hrps` voertuigklasse

## Fase 3 — APK-historie

- [ ] `sgfe-77wx` keuringsmeldingen
- [ ] `a34c-vvps` geconstateerde gebreken
- [ ] `hx2c-gt7k` gebrekcode → omschrijving
- [ ] groeperen per keuringsdatum
- [ ] terugkerende gebreken herkennen
- [ ] nette timeline bouwen

## Fase 4 — recalls

- [ ] kenteken-specifieke open recall indicator
- [ ] `j9yg-7rg9` recall-details
- [ ] `9ihi-jgpf` risico
- [ ] `mu2x-mu5e` merk/type mapping
- [ ] duidelijk onderscheid tussen exacte indicator en mogelijke merk/type matches

## Fase 5 — UX / analyse

- [ ] aandachtspunten bovenaan
- [ ] APK countdown
- [ ] voertuigleeftijd
- [ ] tenaamstellingsduur
- [ ] importleeftijd
- [ ] pk/ton
- [ ] deelbare voertuigpagina
- [ ] vergelijking tussen twee kentekens

---

# 33. Definition of Done

De uitbreiding is klaar wanneer:

1. één kentekenzoekopdracht meerdere RDW-datasets combineert;
2. de frontend slechts onze eigen backend aanspreekt;
3. secundaire API-fouten niet de hele pagina breken;
4. voertuiggegevens zijn genormaliseerd;
5. APK-historie en gebrekcodes leesbaar worden weergegeven;
6. tellerstandoordeel zichtbaar is;
7. import automatisch wordt gedetecteerd;
8. recall-indicator zichtbaar is;
9. brandstof, vermogen, emissie, gewicht, afmetingen en carrosserie zoveel mogelijk gevuld zijn;
10. er nergens claims worden gedaan die niet door de bron worden ondersteund;
11. responses worden gecachet;
12. unit/integratietests aanwezig zijn;
13. ontbrekende data netjes wordt afgehandeld;
14. bestaande functionaliteit niet regressief wordt gebroken.

---

# 34. Opdracht aan de coding-agent

Voer nu het volgende uit:

1. Analyseer de bestaande repository en bepaal frontend/backend/framework/database/cache.
2. Zoek waar de huidige kentekencheck en RDW-client zijn geïmplementeerd.
3. Maak een centrale RDW-client met datasetconfiguratie.
4. Maak een genormaliseerd voertuigdatamodel.
5. Implementeer eerst de hoofd-, brandstof-, carrosserie-, assen- en voertuigklasse-datasets.
6. Implementeer vervolgens APK-meldingen + geconstateerde gebreken + gebrekreferentie.
7. Voeg recall-ondersteuning toe.
8. Maak een analyse-service voor afgeleide velden.
9. Voeg caching en timeouts toe.
10. Werk de bestaande voertuigpagina uit met de nieuwe secties.
11. Schrijf tests.
12. Toon na implementatie:
    - welke bestanden zijn aangepast;
    - welke endpoints zijn toegevoegd;
    - welke RDW datasets gebruikt worden;
    - welke functies nog niet mogelijk zijn met gratis RDW Open Data;
    - hoe de implementatie lokaal getest kan worden.

**Belangrijk:** implementeer daadwerkelijk in de bestaande codebase; geef niet alleen voorbeeldcode of een voorstel.