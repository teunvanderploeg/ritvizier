"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { currency, numeric } from "@/lib/formatting";
import type { Vehicle } from "@/types/vehicle";

const provinces = {
  DR: "Drenthe",
  FL: "Flevoland",
  FR: "Friesland",
  GL: "Gelderland",
  GR: "Groningen",
  LI: "Limburg",
  NB: "Noord-Brabant",
  NH: "Noord-Holland",
  OV: "Overijssel",
  UT: "Utrecht",
  ZL: "Zeeland",
  ZH: "Zuid-Holland",
};
interface Estimate {
  available: boolean;
  reason: string | null;
  quarterly: number | null;
  monthly: number | null;
  annual: number | null;
  weightKg: number | null;
  weightBasis: string;
  weightClass: string | null;
  fuel: string | null;
  year: number;
  needsParticulateChoice: boolean;
  needsGasChoice: boolean;
  notes: string[];
  sourceUrl: string;
}
const calculator =
  "https://www.belastingdienst.nl/wps/wcm/connect/nl/auto-en-vervoer/content/hulpmiddel-motorrijtuigenbelasting-berekenen";
export function RoadTax({
  vehicle,
  onEstimate,
}: {
  vehicle: Vehicle;
  onEstimate: (value: number | null) => void;
}) {
  const [province, setProvince] = useState("");
  const [fine, setFine] = useState("");
  const [gas, setGas] = useState("");
  const [result, setResult] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!province) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/road-tax", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            licensePlate: vehicle.licensePlate,
            province,
            particulateSurcharge: fine ? fine === "yes" : null,
            gasInstallation: gas || null,
          }),
        });
        if (!response.ok)
          throw new Error(
            "De wegenbelasting kan nu niet worden berekend. Probeer opnieuw.",
          );
        const estimate: Estimate = await response.json();
        if (!controller.signal.aborted) {
          setResult(estimate);
          onEstimate(estimate.available ? estimate.monthly : null);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Berekenen lukt nu niet.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [vehicle.licensePlate, province, fine, gas, retry, onEstimate]);
  function reset() {
    setResult(null);
    setError("");
    setBusy(true);
    onEstimate(null);
  }
  return (
    <section className="road-tax-panel" aria-busy={busy}>
      <h3>Wegenbelasting automatisch</h3>
      <p>
        Gewicht en brandstof komen uit de voertuigregistratie. Kies je
        woonprovincie voor het tarief.
      </p>
      <label className="select-field" htmlFor="tax-province">
        Woonprovincie
        <select
          id="tax-province"
          value={province}
          onChange={(e) => {
            reset();
            setProvince(e.target.value);
            if (!e.target.value) setBusy(false);
          }}
        >
          <option value="">Kies je provincie</option>
          {Object.entries(provinces).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {(result?.needsParticulateChoice || fine) && (
        <label className="select-field" htmlFor="tax-fine">
          Fijnstoftoeslag voor deze diesel
          <select
            id="tax-fine"
            value={fine}
            onChange={(e) => {
              reset();
              setFine(e.target.value);
            }}
          >
            <option value="">Kies de toepasselijke situatie</option>
            <option value="no">Nee, geen fijnstoftoeslag</option>
            <option value="yes">Ja, inclusief fijnstoftoeslag</option>
          </select>
          <small>
            Controleer de RDW-uitstoot en de status van het roetfilter.{" "}
            <a
              href="https://www.belastingdienst.nl/wps/wcm/connect/nl/auto-en-vervoer/content/fijnstoftoeslag-motorrijtuigenbelasting"
              target="_blank"
              rel="noreferrer"
            >
              Wanneer geldt de toeslag?
            </a>
          </small>
        </label>
      )}
      {(result?.needsGasChoice || gas) && (
        <label className="select-field" htmlFor="tax-gas">
          Geregistreerde gasinstallatie
          <select
            id="tax-gas"
            value={gas}
            onChange={(e) => {
              reset();
              setGas(e.target.value);
            }}
          >
            <option value="">Kies de gasinstallatie</option>
            <option value="G3">LPG G3</option>
            <option value="other">Overige LPG-installatie</option>
          </select>
        </label>
      )}
      <div aria-live="polite">
        {busy && <p>Wegenbelasting berekenen…</p>}
        {error && (
          <div role="alert">
            <p className="form-error">{error}</p>
            <button
              className="text-button"
              onClick={() => {
                reset();
                setRetry(retry + 1);
              }}
            >
              <RefreshCw size={15} /> Opnieuw berekenen
            </button>
          </div>
        )}
        {result?.available ? (
          <div className="motion-reveal">
            <div className="road-tax-amount">
              <strong>{currency(result.quarterly)}</strong>
              <span>per kwartaal</span>
            </div>
            <p>
              {currency(result.monthly, 2)} per maand ·{" "}
              {currency(result.annual)} per jaar
            </p>
            <p className="cost-footnote">
              {numeric(result.weightKg, "kg")}{" "}
              {result.weightBasis.toLowerCase()} · {result.weightClass} ·{" "}
              {result.fuel}. Tarieven {result.year}, inclusief provinciale
              opcenten.
            </p>
            <small>{result.notes.join(" ")}</small>
          </div>
        ) : (
          result && <p className="motion-reveal">{result.reason}</p>
        )}
      </div>
      <a
        className="source-link"
        href={calculator}
        target="_blank"
        rel="noreferrer"
      >
        Controleer bij de Belastingdienst <ArrowUpRight size={14} />
      </a>
    </section>
  );
}
