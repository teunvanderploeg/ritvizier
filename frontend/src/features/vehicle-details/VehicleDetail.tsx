"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Share2,
  Columns2,
  ShieldCheck,
  CalendarCheck2,
  Fuel,
  Zap,
  Weight,
  Info,
  ArrowUpRight,
  CircleAlert,
  Gauge,
  Bell,
} from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { fetchVehicle } from "@/lib/api";
import { addVehicle, readVehicles, writeVehicles } from "@/lib/storage";
import {
  currency,
  date,
  fuelLabel,
  numeric,
  titleCase,
} from "@/lib/formatting";
import { LicensePlateInput } from "@/components/search/LicensePlateInput";
import { LicensePlateBadge } from "@/components/search/LicensePlateBadge";
import { VehicleIllustration } from "@/components/brand/VehicleIllustration";
import { VehicleDataRow as Row } from "@/components/vehicle/VehicleDataRow";
import { SkeletonVehiclePage } from "@/components/vehicle/SkeletonVehiclePage";
import { ErrorState } from "@/components/common/ErrorState";
import { useCollection } from "@/components/search/RecentSearches";
import { CostEstimator } from "@/features/ownership-costs/CostEstimator";
import { ApkHistory } from "./ApkHistory";
import { TechnicalDetails } from "./TechnicalDetails";
import { FuelRecords } from "./FuelRecords";
import { MileageEstimate } from "./MileageEstimate";
import { PossibleRecalls } from "./PossibleRecalls";
import { useEffect } from "react";
import {
  amsterdamToday,
  apkStatus,
  duration,
  elapsedMonths,
  safeSourceUrl,
  vehicleColors,
} from "./timeline";

const tabs = [
  "Overzicht",
  "APK & registratie",
  "APK-historie",
  "Tellerstand & historie",
  "Terugroepacties",
  "Uitvoering",
  "Motor & prestaties",
  "Verbruik & milieu",
  "Afmetingen & gewicht",
  "Carrosserie & assen",
  "Kosten",
  "Praktisch",
];
const datasetNames: Record<string, string> = {
  "m9d7-ebf2": "Kentekenregister",
  "8ys7-d773": "Brandstof & milieu",
  "3huj-srit": "Asgegevens",
  "vezc-m2t6": "Carrosserie",
  "t49b-isb7": "Terugroepstatus per kenteken",
  "j9yg-7rg9": "Terugroepacties",
  "9ihi-jgpf": "Risico's terugroepacties",
  "jqs4-4kvw": "Tellerstandtoelichting",
  "byxc-wwua": "Typegoedkeuring uitvoering",
  "7rjk-eycs": "Typegoedkeuring transmissie",
  "jhie-znh9": "Carrosseriespecificaties",
  "kmfi-hrps": "Voertuigklassen",
  "sgfe-77wx": "Keuringsmeldingen",
  "a34c-vvps": "Geconstateerde gebreken",
  "hx2c-gt7k": "Gebrekomschrijvingen",
  "mu2x-mu5e": "Terugroepacties per merk en model",
};
function DataSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="data-section">
      <h2>{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}
function flag(value: boolean | null) {
  return value === null ? "Niet beschikbaar" : value ? "Ja" : "Nee";
}
export function VehicleDetail({
  plate,
  initialVehicle,
  initialError,
}: {
  plate: string;
  initialVehicle: Vehicle | null;
  initialError?: string;
}) {
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [error, setError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("Overzicht");
  const [notice, setNotice] = useState("");
  const saved = useCollection("favourites");
  const router = useRouter();
  useEffect(() => {
    if (initialVehicle) addVehicle("recent", initialVehicle);
  }, [initialVehicle]);
  async function retry() {
    setLoading(true);
    setError("");
    try {
      const fresh = await fetchVehicle(plate);
      setVehicle(fresh);
      addVehicle("recent", fresh);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "De voertuiggegevens zijn tijdelijk niet beschikbaar.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (loading) return <SkeletonVehiclePage />;
  if (error || !vehicle)
    return (
      <ErrorState
        message={error || "We konden geen voertuig vinden voor dit kenteken."}
        onRetry={retry}
      />
    );
  const v = vehicle;
  const today = amsterdamToday();
  const apk = apkStatus(v, today);
  const openRecalls = v.recalls.filter((r) => r.statusCode === "O");
  const hasRecall = v.recallPending === true || openRecalls.length > 0;
  const legacyAttention = [
    v.isImport
      ? "Later in Nederland geregistreerd: controleer ook de buitenlandse historie."
      : null,
    v.odometerJudgment === "Onlogisch"
      ? "Onlogisch tellerstandoordeel: controleer het RDW-Voertuigrapport en de onderhoudsbewijzen."
      : null,
    v.odometerJudgment === "Geen oordeel"
      ? "De RDW geeft geen tellerstandoordeel. Lees de toelichting bij Tellerstand & historie."
      : null,
    v.registrationPossible === false
      ? "Tenaamstellen is volgens het register niet mogelijk."
      : null,
    v.wamInsured === false
      ? "Er staat geen WAM-verzekering geregistreerd. Controleer dit met de verzekeraar."
      : null,
    v.isExported ? "Dit voertuig staat als geëxporteerd geregistreerd." : null,
    v.registrationDate &&
    Math.round(
      (Date.parse(today) - Date.parse(v.registrationDate)) / 86400000,
    ) >= 0 &&
    Math.round(
      (Date.parse(today) - Date.parse(v.registrationDate)) / 86400000,
    ) < 30
      ? "De laatste tenaamstelling is minder dan 30 dagen geleden. Vraag bij aankoop naar de reden van verkoop."
      : null,
  ].filter((item): item is string => item !== null);
  const attention = v.analysis.calculatedAt
    ? v.analysis.warnings.map((warning) => warning.description)
    : legacyAttention;
  const isSaved = saved.some((item) => item.licensePlate === v.licensePlate);
  const expired = v.apkExpiryDate ? v.apkExpiryDate < today : false;
  function toggleFavourite() {
    const ok = isSaved
      ? writeVehicles(
          "favourites",
          readVehicles("favourites").filter(
            (item) => item.licensePlate !== v.licensePlate,
          ),
        )
      : addVehicle("favourites", v);
    setNotice(
      ok
        ? isSaved
          ? "Auto verwijderd uit Opgeslagen."
          : "Auto opgeslagen op dit apparaat."
        : "Opslaan lukt niet. Controleer of je browser lokale opslag toestaat.",
    );
  }
  function compare() {
    const existing = readVehicles("comparison");
    if (
      existing.length >= 3 &&
      !existing.some((item) => item.licensePlate === v.licensePlate)
    ) {
      setNotice(
        "Je kunt maximaal drie auto’s vergelijken. Verwijder eerst een auto uit je vergelijking.",
      );
      return;
    }
    if (addVehicle("comparison", v)) router.push("/vergelijken");
    else
      setNotice(
        "Opslaan lukt niet. Controleer de lokale opslag van je browser.",
      );
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: `${titleCase(v.make)} ${v.model || ""} | RitVizier`,
          url: location.href,
        });
      else {
        await navigator.clipboard.writeText(location.href);
        setNotice("Link gekopieerd. Je kunt deze nu delen.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setNotice("Delen lukt niet. Kopieer de link uit je adresbalk.");
    }
  }
  return (
    <div className="container vehicle-page">
      <div className="vehicle-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          Kentekencheck
        </Link>
        <LicensePlateInput compact />
      </div>
      <section className="vehicle-hero">
        <div className="vehicle-heading">
          <span className="eyebrow">{v.make}</span>
          <h1>{titleCase(v.model || v.vehicleType)}</h1>
          <div className="vehicle-subtitle">
            <LicensePlateBadge plate={v.licensePlate} />
            <span>
              {v.firstRegistrationDate?.slice(0, 4) || "Bouwjaar onbekend"} ·{" "}
              {fuelLabel(v.fuelTypes)} · {titleCase(v.bodyType)}
            </span>
          </div>
          <div className="vehicle-actions">
            <button
              className={`button button-secondary ${isSaved ? "saved-button" : ""}`}
              onClick={toggleFavourite}
            >
              <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? "Opgeslagen" : "Auto opslaan"}
            </button>
            <button className="button button-secondary" onClick={compare}>
              <Columns2 size={16} />
              Vergelijken
            </button>
            <button
              className="icon-button bordered-button"
              onClick={share}
              aria-label="Voertuig delen"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
        <div className="vehicle-hero-art">
          <VehicleIllustration />
          <span>Illustratie, geen foto van dit voertuig</span>
        </div>
      </section>
      {notice && (
        <div className="notice" role="status">
          <Info size={16} />
          {notice}
          <button className="text-button" onClick={() => setNotice("")}>
            Sluiten
          </button>
        </div>
      )}
      <div className="quick-facts">
        {[
          {
            icon: CalendarCheck2,
            label: "Bouwjaar",
            value: v.firstRegistrationDate?.slice(0, 4) || "Niet beschikbaar",
          },
          { icon: Fuel, label: "Brandstof", value: fuelLabel(v.fuelTypes) },
          {
            icon: Zap,
            label: "Vermogen",
            value: numeric(v.powerKw, "kW"),
            sub:
              v.powerHp != null
                ? `${numeric(v.powerHp, "pk")} · berekend`
                : undefined,
          },
          {
            icon: Weight,
            label: "Gewicht leeg",
            value: numeric(v.massKg, "kg"),
          },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div className="quick-fact" key={label}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{value}</strong>
            {sub && <small>{sub}</small>}
          </div>
        ))}
      </div>
      <div className="vehicle-status-grid">
        <button
          className="vehicle-status-card"
          onClick={() => setTab("APK-historie")}
        >
          <CalendarCheck2 size={21} />
          <span>
            APK-historie
            <strong>
              {v.apkHistory.inspections.length
                ? `${v.analysis.inspectionCount} keuringsmeldingen`
                : "Bekijk beschikbare historie"}
            </strong>
            <small>
              {v.apkHistory.inspections.length && v.analysis.defectCountComplete
                ? `${v.analysis.defectCount} gebreken geregistreerd · historische informatie`
                : "Meldingen en technische opmerkingen"}
            </small>
          </span>
          <ArrowRight size={16} />
        </button>
        <button
          className={`vehicle-status-card ${v.odometerJudgment === "Onlogisch" ? "status-warning" : ""}`}
          onClick={() => setTab("Tellerstand & historie")}
        >
          <Gauge size={21} />
          <span>
            Tellerstandoordeel
            <strong>{v.odometerJudgment || "Niet beschikbaar"}</strong>
            <small>
              {v.odometerLastYear
                ? `Laatste registratie: ${v.odometerLastYear}`
                : "Bekijk de RDW-toelichting"}
            </small>
          </span>
          <ArrowRight size={16} />
        </button>
        <button
          className={`vehicle-status-card ${hasRecall ? "status-warning" : ""}`}
          onClick={() => setTab("Terugroepacties")}
        >
          <Bell size={21} />
          <span>
            Terugroepacties
            <strong>
              {hasRecall
                ? "Actie nodig"
                : v.recallPending === false
                  ? "Geen openstaande actie"
                  : "Niet beschikbaar"}
            </strong>
            <small>
              {hasRecall
                ? "Bekijk defect en hersteladvies"
                : "Status en gekoppelde acties"}
            </small>
          </span>
          <ArrowRight size={16} />
        </button>
      </div>
      <div
        className={`apk-banner ${apk.exempt || !v.apkExpiryDate ? "neutral-banner" : apk.warning ? "warning-banner" : ""}`}
      >
        <div>
          {expired ? <CircleAlert size={20} /> : <CalendarCheck2 size={20} />}
          <span>
            <strong>
              {apk.exempt
                ? "Niet APK-plichtig: personenauto van 50 jaar of ouder"
                : v.apkExpiryDate
                  ? `${expired ? "APK verlopen op" : "APK geldig tot"} ${date(v.apkExpiryDate)}`
                  : "APK-datum niet beschikbaar"}
            </strong>
            <span>
              {apk.days != null
                ? `${apk.status} · ${apk.days < 0 ? `${Math.abs(apk.days)} dagen geleden verlopen` : `nog ${apk.days} dagen`}. Berekend vanaf vandaag.`
                : apk.exempt
                  ? "Afgeleid uit voertuigleeftijd en toegestane massa volgens de RDW-regeling."
                  : "Voor dit voertuig heeft de RDW geen APK-datum beschikbaar."}
            </span>
          </span>
        </div>
        <button
          className="text-button"
          onClick={() => setTab("APK & registratie")}
        >
          Bekijk registratie <ArrowRight size={15} />
        </button>
      </div>
      <nav className="section-tabs" aria-label="Voertuigonderdelen">
        {tabs
          .filter(
            (item) =>
              item !== "Carrosserie & assen" ||
              v.bodies.length ||
              v.bodySpecifications.length ||
              v.vehicleClasses.length ||
              v.axes.length,
          )
          .map((item) => (
            <button
              aria-pressed={item === tab}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
      </nav>
      <div className="vehicle-tab-content" key={tab}>
        {tab === "Overzicht" && (
          <>
            {attention.length > 0 && (
              <section className="attention-panel">
                <h2>
                  <CircleAlert size={19} /> Aandachtspunten
                </h2>
                <ul>
                  {attention.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            <div className="data-grid">
              <DataSection title="De belangrijkste gegevens">
                <Row label="Merk" value={titleCase(v.make)} />
                <Row label="Model" value={titleCase(v.model)} />
                <Row
                  label="Voertuigsoort"
                  value={v.vehicleType || "Niet beschikbaar"}
                />
                <Row
                  label="Eerste toelating"
                  value={date(v.firstRegistrationDate)}
                  explanation="De datum waarop dit voertuig voor het eerst is geregistreerd, ook als dat buiten Nederland was."
                />
                <Row
                  label="Catalogusprijs"
                  value={currency(v.catalogPrice)}
                  explanation="De nieuwprijs volgens de RDW. Dit is niet de huidige marktwaarde."
                />
                <Row label="Kleuren" value={vehicleColors(v)} />
                <Row
                  label="Uitvoeringcode"
                  value={v.version || "Niet beschikbaar"}
                />
                <Row
                  label="Transmissie"
                  value={
                    v.typeApproval.transmission ||
                    v.typeApproval.transmissionCode ||
                    "Niet beschikbaar"
                  }
                />
                <Row
                  label="Laatste tenaamstelling"
                  value={date(v.registrationDate)}
                />
              </DataSection>
              <DataSection title="Handig om te weten">
                <Row label="Zitplaatsen" value={numeric(v.numberOfSeats)} />
                <Row label="Deuren" value={numeric(v.numberOfDoors)} />
                <Row
                  label="Trekgewicht geremd"
                  value={numeric(v.towingBrakedKg, "kg")}
                  explanation="De maximale massa van een aanhanger met eigen remmen."
                />
                <Row
                  label="Geïmporteerd"
                  value={
                    v.isImport == null
                      ? "Niet beschikbaar"
                      : v.isImport
                        ? "Waarschijnlijk geïmporteerd"
                        : "Geen latere Nederlandse registratie"
                  }
                  derived
                  explanation="Afgeleid uit de eerste toelating en eerste Nederlandse registratie. Een latere Nederlandse registratie wijst op import."
                />
                <Row
                  label="Openstaande terugroepactie"
                  value={flag(v.recallPending)}
                />
                <Row label="Brandstof" value={fuelLabel(v.fuelTypes)} />
                <Row
                  label="Tellerstandoordeel"
                  value={v.odometerJudgment || "Niet beschikbaar"}
                />
                <Row label="WAM-verzekerd" value={flag(v.wamInsured)} />
              </DataSection>
            </div>
            <div className="vehicle-cost-promo">
              <div>
                <span className="eyebrow">MEER DAN DE AANSCHAFPRIJS</span>
                <h2>Wat kost deze auto jou per maand?</h2>
                <p>
                  Wegenbelasting automatisch uit voertuiggegevens. Kies je
                  provincie en vul jouw vaste lasten in.
                </p>
              </div>
              <button className="button" onClick={() => setTab("Kosten")}>
                Bereken je kosten <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}
        {tab === "APK & registratie" && (
          <div className="data-grid">
            <DataSection title="APK & toelating">
              <Row label="APK geldig tot" value={date(v.apkExpiryDate)} />
              <Row label="APK-status" value={apk.status} derived />
              <Row
                label="Dagen tot APK-verval"
                value={numeric(apk.days, "dagen")}
                derived
              />
              <Row
                label="APK-plicht"
                value={
                  apk.exempt
                    ? "Nee, vrijgesteld op grond van leeftijd"
                    : v.vehicleType === "Personenauto"
                      ? "Ja, algemene APK-regeling"
                      : "Controleer bij de RDW"
                }
                explanation="Afgeleid uit voertuigsoort, toegestane massa en leeftijd. Individuele vrijstellingen en schorsing zijn niet bekend."
                derived
              />
              <Row
                label="Datum laatste APK"
                value={date(
                  v.apkHistory.inspections.find(
                    (event) => event.hasNotification,
                  )?.date ?? null,
                )}
                explanation="Laatste beschikbare APK-meldingsdatum. De openbare meldingen zijn geen garantie voor een complete keuringshistorie."
              />
              <Row
                label="Eerste toelating"
                value={date(v.firstRegistrationDate)}
              />
              <Row
                label="Eerste registratie Nederland"
                value={date(v.firstRegistrationNetherlandsDate)}
              />
              <Row
                label="Importindicatie"
                value={
                  v.isImport == null
                    ? "Niet beschikbaar"
                    : v.isImport
                      ? "Waarschijnlijk geïmporteerd"
                      : "Geen latere Nederlandse registratie"
                }
                derived
              />
              <Row
                label="Laatste tenaamstelling"
                value={date(v.registrationDate)}
              />
              <Row
                label="Tenaamstelling mogelijk"
                value={flag(v.registrationPossible)}
              />
            </DataSection>
            <DataSection title="Registratiestatus">
              <Row label="Geëxporteerd" value={flag(v.isExported)} />
              <Row label="Taxi-indicatie" value={flag(v.isTaxi)} />
              <Row label="WAM-verzekerd" value={flag(v.wamInsured)} />
              <Row
                label="Wacht op keuren"
                value={
                  v.waitingForInspection == null
                    ? "Niet openbaar / onbekend"
                    : flag(v.waitingForInspection)
                }
              />
              <Row
                label="Gestolen / rijverbod"
                value="Controleer in RDW Kentekencheck"
                explanation="Deze status wordt niet als ja/nee meegeleverd in de gebruikte openbare datasets."
              />
              <Row
                label="Openstaande terugroepactie"
                value={flag(v.recallPending)}
              />
              <Row label="Bruto BPM bij registratie" value={currency(v.bpm)} />
            </DataSection>
            <p className="data-note">
              <Info size={16} />
              Openbare registratiegegevens vertellen niets over schade,
              onderhoud of eerdere eigenaren.
            </p>
          </div>
        )}
        {tab === "Tellerstand & historie" && (
          <>
            <div className="data-grid">
              <DataSection title="Geregistreerd tellerstandoordeel">
                <Row
                  label="Oordeel"
                  value={v.odometerJudgment || "Niet beschikbaar"}
                />
                <Row
                  label="Toelichtingcode"
                  value={v.odometerJudgmentCode || "Niet beschikbaar"}
                />
                <Row
                  label="Jaar laatste registratie"
                  value={v.odometerLastYear?.toString() ?? "Niet beschikbaar"}
                />
                <Row
                  label="Exacte kilometerstand"
                  value="Niet openbaar beschikbaar"
                  explanation="Open Data bevat het oordeel, niet de kilometerstand of de complete reeks registraties."
                />
              </DataSection>
              <div className="explanation-panel">
                <Gauge size={25} />
                <h3>Wat betekent dit oordeel?</h3>
                <blockquote>
                  {v.odometerExplanation ||
                    "De geregistreerde toelichting is niet beschikbaar. Controleer het oordeel in de officiële kentekencheck."}
                </blockquote>
                <p>
                  Een logisch oordeel beschrijft de geregistreerde reeks. Vraag
                  bij aankoop ook om het actuele RDW-Voertuigrapport en
                  onderhoudsbewijzen.
                </p>
              </div>
              <DataSection title="Registratiehistorie">
                <Row
                  label="Eerste toelating wereldwijd"
                  value={date(v.firstRegistrationDate)}
                />
                <Row
                  label="Eerste registratie Nederland"
                  value={date(v.firstRegistrationNetherlandsDate)}
                />
                <Row
                  label="Laatste tenaamstelling"
                  value={date(v.registrationDate)}
                />
                <Row
                  label="Leeftijd voertuig"
                  value={duration(
                    elapsedMonths(v.firstRegistrationDate, today),
                  )}
                  derived
                />
                <Row
                  label="Duur sinds tenaamstelling"
                  value={duration(elapsedMonths(v.registrationDate, today))}
                  derived
                />
              </DataSection>
              <DataSection title="Importcontrole">
                <Row label="Importindicatie" value={flag(v.isImport)} derived />
                <Row
                  label="Leeftijd bij Nederlandse registratie"
                  value={duration(
                    v.firstRegistrationNetherlandsDate
                      ? elapsedMonths(
                          v.firstRegistrationDate,
                          v.firstRegistrationNetherlandsDate,
                        )
                      : null,
                  )}
                  derived
                />
                <Row label="Exportindicator" value={flag(v.isExported)} />
                <Row
                  label="Aantal eerdere eigenaren"
                  value="Niet openbaar beschikbaar"
                />
              </DataSection>
            </div>
            {v.isImport && (
              <p className="data-note">
                <Info size={16} />
                Deze auto is later in Nederland geregistreerd. De openbare
                gegevens geven geen volledig beeld van de buitenlandse historie.
              </p>
            )}
            <MileageEstimate vehicle={v} />
          </>
        )}
        {tab === "APK-historie" && <ApkHistory vehicle={v} />}
        {tab === "Carrosserie & assen" && <TechnicalDetails vehicle={v} />}
        {tab === "Terugroepacties" && (
          <>
            <div
              className={`recall-summary ${hasRecall ? "status-warning" : ""}`}
            >
              <Bell size={24} />
              <div>
                <h2>
                  {hasRecall
                    ? "Er staat een terugroepactie open"
                    : v.recallPending === false
                      ? "Geen openstaande terugroepactie gemeld"
                      : "Terugroepstatus niet beschikbaar"}
                </h2>
                <p>
                  {hasRecall
                    ? "Neem contact op met de merkdealer om de actie en herstelplanning te controleren."
                    : "Dit is de indicator in het opgehaalde kentekenregister."}
                </p>
              </div>
            </div>
            {!v.recallDetailsAvailable && (
              <p className="data-note">
                <Info size={16} />
                De gekoppelde actiegegevens zijn niet volledig beschikbaar. De
                algemene indicator hierboven komt uit het kentekenregister.
              </p>
            )}
            {v.recallDetailsAvailable && v.recalls.length === 0 && (
              <p className="data-note">
                In het openbare terugroepregister zijn geen acties aan dit
                kenteken gekoppeld. Controleer bij de merkdealer of er ook
                fabrikantcampagnes zijn.
              </p>
            )}
            <div className="recall-list">
              {v.recalls.map((r) => (
                <section className="recall-card" key={r.reference}>
                  <div className="recall-card-heading">
                    <h3>{r.reference}</h3>
                    <span
                      className={`recall-badge ${r.statusCode === "O" ? "status-warning" : ""}`}
                    >
                      {r.status ||
                        (r.statusCode === "O"
                          ? "Openstaand"
                          : r.statusCode === "P"
                            ? "Producent heeft herstel gemeld"
                            : "Status onbekend")}
                    </span>
                  </div>
                  <dl>
                    <Row
                      label="Publicatiedatum"
                      value={date(r.publicationDate)}
                    />
                    <Row
                      label="Producent"
                      value={r.producer || "Niet beschikbaar"}
                    />
                    <Row
                      label="Fabrikantreferentie"
                      value={r.producerReference || "Niet beschikbaar"}
                    />
                    <Row
                      label="Defect"
                      value={r.defect || "Niet beschikbaar"}
                    />
                    <Row
                      label="Mogelijke gevolgen"
                      value={r.consequences || "Niet beschikbaar"}
                    />
                    <Row
                      label="Risico"
                      value={r.risks.join(" · ") || "Niet beschikbaar"}
                    />
                    <Row
                      label="Herstel"
                      value={r.remedy || "Niet beschikbaar"}
                    />
                    <Row
                      label="Telefoon producent"
                      value={r.phone || "Niet beschikbaar"}
                    />
                  </dl>
                  {safeSourceUrl(r.url) && (
                    <a
                      className="source-link"
                      href={safeSourceUrl(r.url)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Meer informatie van de producent{" "}
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </section>
              ))}
            </div>
            <a
              className="source-link"
              href="https://ovi.rdw.nl/"
              target="_blank"
              rel="noreferrer"
            >
              Controleer bij de RDW <ArrowUpRight size={14} />
            </a>
            <PossibleRecalls vehicle={v} />
          </>
        )}
        {tab === "Uitvoering" && (
          <>
            <div className="data-grid">
              <DataSection title="Voertuigidentificatie">
                <Row label="Type" value={v.typeCode || "Niet beschikbaar"} />
                <Row label="Variant" value={v.variant || "Niet beschikbaar"} />
                <Row
                  label="Uitvoeringcode"
                  value={v.version || "Niet beschikbaar"}
                />
                <Row
                  label="Europese typegoedkeuring"
                  value={v.typeApprovalNumber || "Niet beschikbaar"}
                />
                <Row
                  label="Europese voertuigcategorie"
                  value={v.europeanCategory || "Niet beschikbaar"}
                />
                <Row
                  label="Carrosseriecode"
                  value={v.bodyCode || "Niet beschikbaar"}
                />
                <Row label="Inrichting" value={titleCase(v.bodyType)} />
              </DataSection>
              <DataSection title="Gekoppelde typegoedkeuring">
                <Row
                  label="Exacte uitvoering gevonden"
                  value={
                    v.typeApproval.matched ? "Ja" : "Geen aanvullende gegevens"
                  }
                />
                <Row
                  label="Transmissie"
                  value={v.typeApproval.transmission || "Niet beschikbaar"}
                />
                <Row
                  label="Transmissiecode"
                  value={v.typeApproval.transmissionCode || "Niet beschikbaar"}
                />
                <Row
                  label="Aantal versnellingen"
                  value={numeric(v.typeApproval.gears)}
                />
                <Row
                  label="Commerciële uitvoering / pakket"
                  value="Niet openbaar beschikbaar"
                />
              </DataSection>
            </div>
            <p className="data-note">
              <Info size={16} />
              Aanvullende techniek is gekoppeld op het volledige
              typegoedkeuringsnummer, de variant en de uitvoering. Een
              commerciële pakketnaam of optielijst volgt niet uit de
              uitvoeringcode. Waarden met meerdere mogelijkheden blijven
              onbekend.
            </p>
          </>
        )}
        {tab === "Motor & prestaties" && (
          <>
            <div className="data-grid">
              <DataSection title="Motor">
                <Row label="Brandstof" value={fuelLabel(v.fuelTypes)} />
                <Row
                  label="Aandrijving"
                  value={
                    v.hybridClass === "OVC-HEV"
                      ? "Plug-inhybride (PHEV)"
                      : v.hybridClass === "NOVC-HEV"
                        ? "Hybride (HEV)"
                        : v.fuelTypes.length === 1 &&
                            v.fuelTypes[0] === "Elektriciteit"
                          ? "Volledig elektrisch (EV)"
                          : fuelLabel(v.fuelTypes)
                  }
                />
                <Row
                  label="Geregistreerde hybrideklasse"
                  value={v.hybridClass || "Niet geregistreerd"}
                />
                <Row
                  label="Cilinderinhoud"
                  value={numeric(v.engineCapacityCc, "cc")}
                />
                <Row label="Cilinders" value={numeric(v.cylinders)} />
                <Row label="Vermogen" value={numeric(v.powerKw, "kW")} />
                <Row
                  label="Vermogen in paardenkracht"
                  value={numeric(v.powerHp, "pk")}
                  derived
                  explanation="Omgerekend uit kW. 1 kW is ongeveer 1,36 pk."
                />
              </DataSection>
              <DataSection title="Prestaties">
                <Row
                  label="Transmissie"
                  value={v.typeApproval.transmission || "Niet beschikbaar"}
                />
                <Row
                  label="Versnellingen"
                  value={numeric(v.typeApproval.gears)}
                />
                <Row
                  label="Vermogen per ton rijklaar"
                  value={numeric(
                    v.analysis.powerHpPerTon ??
                      (v.powerHp != null && v.readyMassKg
                        ? (v.powerHp / v.readyMassKg) * 1000
                        : null),
                    "pk/ton",
                  )}
                  derived
                />
                <Row
                  label="Elektrisch vermogen"
                  value={numeric(v.electricPowerKw, "kW")}
                />
                <Row
                  label="Maximumsnelheid"
                  value={numeric(v.maxSpeedKmh, "km/u")}
                />
              </DataSection>
            </div>
            <FuelRecords vehicle={v} />
          </>
        )}
        {tab === "Verbruik & milieu" && (
          <div className="data-grid">
            <DataSection title="Uitstoot & verbruik">
              <Row
                label="CO₂-uitstoot (voorkeur WLTP)"
                value={numeric(v.emissionsCo2, "g/km")}
                explanation="De geregistreerde gecombineerde uitstoot. Praktijkuitstoot kan verschillen."
              />
              <Row
                label="CO₂ WLTP"
                value={numeric(v.emissionsCo2Wltp, "g/km")}
              />
              <Row
                label="CO₂ NEDC"
                value={numeric(v.emissionsCo2Nedc, "g/km")}
              />
              <Row
                label="CO₂ gewogen WLTP (PHEV)"
                value={numeric(v.emissionsCo2WeightedWltp, "g/km")}
              />
              <Row
                label="Emissieklasse"
                value={v.emissionClass || "Niet beschikbaar"}
              />
              <Row
                label="Brandstofverbruik NEDC"
                value={numeric(v.consumptionCombined, "l/100 km")}
              />
              <Row
                label="Brandstofverbruik WLTP"
                value={numeric(v.consumptionWltp, "l/100 km")}
              />
              <Row
                label="Verbruik gewogen WLTP (PHEV)"
                value={numeric(v.consumptionWeightedWltp, "l/100 km")}
              />
              <Row
                label="Verbruik stad (NEDC)"
                value={numeric(v.consumptionCity, "l/100 km")}
              />
              <Row
                label="Verbruik buitenweg (NEDC)"
                value={numeric(v.consumptionHighway, "l/100 km")}
              />
              <Row
                label="Kilometers per liter (WLTP)"
                value={numeric(
                  v.consumptionWltp ? 100 / v.consumptionWltp : null,
                  "km/l",
                )}
                derived
              />
              <Row
                label="Elektrisch verbruik"
                value={numeric(v.electricConsumption, "kWh/100 km")}
              />
              <Row
                label="Elektrische actieradius WLTP"
                value={numeric(v.electricRangeKm, "km")}
              />
            </DataSection>
            <DataSection title="Milieu & geluid">
              <Row
                label="Milieuklasse EG-goedkeuring"
                value={v.environmentalApproval || "Niet beschikbaar"}
              />
              <Row
                label="Deeltjesuitstoot WLTP"
                value={numeric(v.particulateEmissionsWltp, "mg/km")}
              />
              <Row
                label="Deeltjesuitstoot (licht)"
                value={
                  v.particulateEmissions == null
                    ? "Niet beschikbaar"
                    : `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 5 }).format(v.particulateEmissions)} g/km`
                }
              />
              <Row
                label="Geluidsniveau stationair"
                value={numeric(v.noiseStationaryDb, "dB(A)")}
              />
              <Row
                label="Toerental geluidsmeting"
                value={numeric(v.noiseRpm, "t/min")}
              />
              <Row
                label="Geluidsniveau rijdend"
                value={numeric(v.noiseDrivingDb, "dB(A)")}
              />
              <Row
                label="NOx / roetfilterstatus"
                value="Niet in gebruikte Open Data"
              />
            </DataSection>
            <div className="explanation-panel data-wide">
              <Fuel size={25} />
              <h3>Op papier en op de weg</h3>
              <p>
                Geregistreerd verbruik is gemeten onder testomstandigheden. Je
                rijstijl, snelheid en het weer hebben invloed op het werkelijke
                verbruik.
              </p>
              <p>
                Ontbreekt een waarde? Je kunt zelf een verbruik invullen bij de
                kostenberekening.
              </p>
              <button className="text-button" onClick={() => setTab("Kosten")}>
                Naar de kostenberekening <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
        {tab === "Afmetingen & gewicht" && (
          <div className="data-grid">
            <DataSection title="Afmetingen">
              <Row label="Lengte" value={numeric(v.lengthCm, "cm")} />
              <Row label="Breedte" value={numeric(v.widthCm, "cm")} />
              <Row label="Hoogte" value={numeric(v.heightCm, "cm")} />
              <Row
                label="Wielbasis"
                value={numeric(v.wheelbaseCm, "cm")}
                explanation="De afstand tussen de vooras en achteras."
              />
            </DataSection>
            <DataSection title="Gewicht">
              <Row label="Massa leeg" value={numeric(v.massKg, "kg")} />
              <Row
                label="Massa rijklaar"
                value={numeric(v.readyMassKg, "kg")}
                explanation="Het gewicht van de auto in rijklare toestand, inclusief vloeistoffen en de wettelijk meegerekende bestuurder."
              />
              <Row
                label="Technische maximummassa"
                value={numeric(v.technicalMaxMassKg, "kg")}
              />
              <Row
                label="Maximum massa samenstel"
                value={numeric(v.combinationMaxMassKg, "kg")}
              />
              <Row
                label="Toegestane maximummassa"
                value={numeric(v.maxMassKg, "kg")}
              />
              <Row
                label={
                  v.payloadDerived
                    ? "Laadvermogen vanaf rijklaar"
                    : "Geregistreerd laadvermogen"
                }
                value={numeric(v.payloadKg, "kg")}
                derived={v.payloadDerived}
                explanation={
                  v.payloadDerived
                    ? "Toegestane maximummassa min massa rijklaar."
                    : "Het laadvermogen uit de voertuigregistratie."
                }
              />
            </DataSection>
            <DataSection title="Afmetingen typegoedkeuring">
              {(
                [
                  ["Lengte", v.typeApproval.lengthMm],
                  ["Breedte", v.typeApproval.widthMm],
                  ["Hoogte", v.typeApproval.heightMm],
                  ["Wielbasis", v.typeApproval.wheelbaseMm],
                ] as const
              ).map(([label, mm]) => (
                <Row
                  key={label}
                  label={`${label} exact`}
                  value={
                    mm == null
                      ? "Niet beschikbaar"
                      : `${numeric(mm, "mm")} · ${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(mm / 1000)} m`
                  }
                />
              ))}
            </DataSection>
            <DataSection title="Asgegevens">
              {v.axes.length ? (
                v.axes.map((a, i) => (
                  <Row
                    key={i}
                    label={`As ${a.number ?? i + 1}${a.position === "V" ? " (voor)" : a.position === "A" ? " (achter)" : ""}`}
                    value={
                      <>
                        {numeric(a.trackCm, "cm")} spoorbreedte
                        <br />
                        {numeric(a.maxMassKg, "kg")} maximale aslast
                      </>
                    }
                  />
                ))
              ) : (
                <Row label="Spoorbreedte en aslast" value="Niet beschikbaar" />
              )}
            </DataSection>
          </div>
        )}
        {tab === "Kosten" && <CostEstimator vehicle={v} />}
        {tab === "Praktisch" && (
          <div className="data-grid">
            <DataSection title="Dagelijks gebruik">
              <Row label="Carrosserie" value={titleCase(v.bodyType)} />
              <Row label="Zitplaatsen" value={numeric(v.numberOfSeats)} />
              <Row label="Deuren" value={numeric(v.numberOfDoors)} />
              <Row label="Eerste kleur" value={titleCase(v.colorPrimary)} />
              <Row label="Tweede kleur" value={titleCase(v.colorSecondary)} />
              <Row label="Aantal wielen" value={numeric(v.numberOfWheels)} />
              <Row label="Staanplaatsen" value={numeric(v.standingPlaces)} />
            </DataSection>
            <DataSection title="Een aanhanger meenemen">
              <Row
                label="Maximum massa samenstel"
                value={numeric(v.combinationMaxMassKg, "kg")}
              />
              <Row
                label="Verticale koppellast"
                value={numeric(v.couplingMaxLoadKg, "kg")}
              />
              <Row
                label="Trekgewicht geremd"
                value={numeric(v.towingBrakedKg, "kg")}
              />
              <Row
                label="Trekgewicht ongeremd"
                value={numeric(v.towingUnbrakedKg, "kg")}
              />
              <Row
                label={
                  v.payloadDerived
                    ? "Laadvermogen vanaf rijklaar"
                    : "Geregistreerd laadvermogen"
                }
                value={numeric(v.payloadKg, "kg")}
                derived={v.payloadDerived}
              />
            </DataSection>
          </div>
        )}
      </div>
      <section className="source-info">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Bronnen & actualiteit</h2>
          <span className="data-quality">
            {v.source.partial
              ? "Enkele bronnen onvolledig"
              : v.source.missingFields.length
                ? "Enkele gegevens ontbreken"
                : "Beschikbare velden opgehaald"}
          </span>
        </div>
        <p>
          Openbare bronnen:{" "}
          <a href="https://opendata.rdw.nl/" target="_blank" rel="noreferrer">
            Open voertuigdata <ArrowUpRight size={13} />
          </a>{" "}
          · Check samengesteld op{" "}
          {new Intl.DateTimeFormat("nl-NL", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "Europe/Amsterdam",
          }).format(new Date(v.source.fetchedAt))}
        </p>
        <div className="dataset-links">
          {v.source.datasets.map((id) => (
            <a
              key={id}
              href={`https://opendata.rdw.nl/resource/${id}.json`}
              target="_blank"
              rel="noreferrer"
            >
              {datasetNames[id] || "Aanvullende bron"}{" "}
              <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
        {Object.keys(v.source.sections).length > 0 && (
          <details className="technical-disclosure source-status">
            <summary>
              Actualiteit per onderdeel <ArrowRight size={16} />
            </summary>
            <dl>
              {Object.entries(v.source.sections).map(([section, source]) => (
                <Row
                  key={section}
                  label={datasetNames[source.datasets[0]] || "Aanvullende bron"}
                  value={
                    source.available ? (
                      <>
                        {date(source.fetchedAt.slice(0, 10))}
                        <br />
                        {source.recordCount} records
                        {source.truncated ? " · Onvolledig" : ""}
                      </>
                    ) : (
                      "Tijdelijk niet beschikbaar"
                    )
                  }
                />
              ))}
            </dl>
          </details>
        )}
        <p>
          Berekende waarden en kosteninschattingen zijn van RitVizier. Je ziet
          geen informatie over eigenaren, schade of onderhoud.
        </p>
        {v.source.warnings.map((warning) => (
          <p key={warning} className="data-note">
            {warning}
          </p>
        ))}
      </section>
    </div>
  );
}
