"use client";
import { useCallback, useEffect, useState } from "react";
import { Coins, Info, ArrowUpRight } from "lucide-react";
import { currency } from "@/lib/formatting";
import type { Vehicle } from "@/types/vehicle";
import { RoadTax } from "./RoadTax";
interface Assumptions {
  annualKm: number;
  consumption: number;
  energyPrice: number;
  insuranceMonthly: number;
  maintenanceMonthly: number;
  roadTaxMonthly: number;
}
interface Estimate {
  energyMonthly: number;
  insuranceMonthly: number;
  maintenanceMonthly: number;
  roadTaxMonthly: number;
  monthly: number;
  annual: number;
}
export function CostEstimator({ vehicle }: { vehicle?: Vehicle }) {
  const electric =
    vehicle?.fuelTypes.length === 1 &&
    vehicle.fuelTypes.includes("Elektriciteit");
  const [values, setValues] = useState<Assumptions>({
    annualKm: 15000,
    consumption: electric
      ? (vehicle?.electricConsumption ?? 18)
      : (vehicle?.consumptionWltp ?? vehicle?.consumptionCombined ?? 6.5),
    energyPrice: electric ? 0.35 : 2.1,
    insuranceMonthly: 65,
    maintenanceMonthly: 50,
    roadTaxMonthly: 0,
  });
  const [result, setResult] = useState<Estimate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  const [manualTax, setManualTax] = useState(!vehicle);
  const [taxMonthly, setTaxMonthly] = useState<number | null>(null);
  const acceptTax = useCallback((amount: number | null) => {
    setTaxMonthly(amount);
    setBusy(true);
  }, []);
  const taxIncomplete = !manualTax && taxMonthly === null;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            roadTaxMonthly: manualTax
              ? values.roadTaxMonthly
              : (taxMonthly ?? 0),
          }),
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "De berekening is tijdelijk niet beschikbaar. Probeer het zo opnieuw.",
          );
        const data: Estimate = await response.json();
        setResult(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "De berekening is tijdelijk niet beschikbaar.",
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [values, retry, taxMonthly, manualTax]);
  function update(key: keyof Assumptions, value: string, max: number) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      setBusy(true);
      setValues((current) => ({
        ...current,
        [key]: Math.max(0, Math.min(max, number)),
      }));
    }
  }
  const entries = result
    ? [
        {
          label: electric ? "Elektriciteit" : "Brandstof",
          value: result.energyMonthly,
          color: "#2457f5",
        },
        {
          label: "Verzekering",
          value: result.insuranceMonthly,
          color: "#11a99a",
        },
        {
          label: "Onderhoud",
          value: result.maintenanceMonthly,
          color: "#94b6ad",
        },
        {
          label: "Wegenbelasting",
          value: result.roadTaxMonthly,
          color: "#e2b63c",
        },
      ]
    : [];
  let cumulative = 0;
  const gradient = entries
    .map((item) => {
      const from = cumulative;
      cumulative += result?.monthly ? (item.value / result.monthly) * 100 : 0;
      return `${item.color} ${from}% ${cumulative}%`;
    })
    .join(",");
  return (
    <div className="cost-estimator">
      <div className="cost-inputs">
        <div className="section-title">
          <Coins size={21} />
          <h2>Wat kost je auto per maand?</h2>
        </div>
        <p>
          Pas de voorbeeldwaarden aan jouw situatie aan. De uitkomst is een
          inschatting op basis van je invoer.
        </p>
        {vehicle && (
          <>
            {!manualTax && <RoadTax vehicle={vehicle} onEstimate={acceptTax} />}
            <button
              className="text-button tax-mode-button"
              onClick={() => {
                setBusy(true);
                setTaxMonthly(null);
                setManualTax(!manualTax);
              }}
            >
              {manualTax
                ? "Wegenbelasting automatisch berekenen"
                : "Zelf een bedrag voor wegenbelasting invullen"}
            </button>
            <p className="cost-footnote">
              Verbruik vooraf ingevuld met{" "}
              {vehicle.consumptionWltp != null
                ? "geregistreerde WLTP-waarden"
                : vehicle.consumptionCombined != null
                  ? "geregistreerde NEDC-waarden"
                  : "een voorbeeldwaarde"}
              . Pas dit aan je praktijkverbruik aan.
            </p>
          </>
        )}
        <label className="range-label" htmlFor="annual-km">
          Kilometers per jaar{" "}
          <strong>
            {new Intl.NumberFormat("nl-NL").format(values.annualKm)} km
          </strong>
        </label>
        <input
          id="annual-km"
          type="range"
          min="0"
          max="50000"
          step="1000"
          value={Math.min(values.annualKm, 50000)}
          onChange={(e) => update("annualKm", e.target.value, 200000)}
        />
        <div className="range-extremes">
          <span>0 km</span>
          <span>50.000 km</span>
        </div>
        <div className="cost-fields">
          {(
            [
              ["annualKm", "Exacte jaarkilometers", "km", 200000, 1000],
              [
                "consumption",
                "Verbruik per 100 km",
                electric ? "kWh" : "liter",
                200,
                0.1,
              ],
              [
                "energyPrice",
                electric ? "Laadprijs per kWh" : "Brandstofprijs per liter",
                "€",
                20,
                0.01,
              ],
              ["insuranceMonthly", "Verzekering per maand", "€", 2000, 1],
              ["maintenanceMonthly", "Onderhoud per maand", "€", 2000, 1],
              ["roadTaxMonthly", "Wegenbelasting per maand", "€", 2000, 1],
            ] as const
          )
            .filter(([key]) => key !== "roadTaxMonthly" || manualTax)
            .map(([key, label, unit, max, step]) => (
              <label key={key} className="cost-field" htmlFor={`cost-${key}`}>
                <span>{label}</span>
                <div>
                  <input
                    id={`cost-${key}`}
                    type="number"
                    min="0"
                    max={max}
                    step={step}
                    inputMode="decimal"
                    value={values[key]}
                    onChange={(e) => update(key, e.target.value, max)}
                  />
                  <span>{unit}</span>
                </div>
              </label>
            ))}
        </div>
        {manualTax && (
          <p className="cost-footnote">
            <Info size={16} />
            Wegenbelasting staat standaard op € 0. Vul je eigen bedrag in voor
            een bruikbare totaalschatting.
          </p>
        )}
        {manualTax && (
          <a
            className="source-link"
            href="https://www.belastingdienst.nl/wps/wcm/connect/nl/auto-en-vervoer/content/hulpmiddel-motorrijtuigenbelasting-berekenen"
            target="_blank"
            rel="noreferrer"
          >
            Bereken je wegenbelasting bij de Belastingdienst{" "}
            <ArrowUpRight size={14} />
          </a>
        )}
      </div>
      <div className="cost-result" aria-busy={busy}>
        <h2>Kosteninschatting</h2>
        <div className="cost-total" aria-live="polite">
          {error
            ? "Niet beschikbaar"
            : result
              ? currency(
                  taxIncomplete
                    ? result.monthly - result.roadTaxMonthly
                    : result.monthly,
                )
              : "Berekenen…"}
          <span>{result && !error ? "per maand" : ""}</span>
        </div>
        <p>
          {result && !error
            ? `${currency(taxIncomplete ? result.annual - result.roadTaxMonthly * 12 : result.annual)} per jaar`
            : ""}
          {busy && result ? " · Wordt bijgewerkt…" : ""}
        </p>
        {taxIncomplete && (
          <p className="tax-incomplete">
            Tussentotaal zonder wegenbelasting. Kies je provincie of vul zelf
            een bedrag in.
          </p>
        )}
        {error ? (
          <div role="alert">
            <p className="form-error">{error}</p>
            <button
              className="button button-secondary"
              onClick={() => setRetry(retry + 1)}
            >
              Opnieuw berekenen
            </button>
          </div>
        ) : (
          result && (
            <>
              <div
                className="cost-donut"
                style={{
                  background: result.monthly
                    ? `conic-gradient(${gradient})`
                    : "var(--border)",
                }}
                aria-hidden="true"
              >
                <div>
                  <Coins size={24} />
                </div>
              </div>
              <dl className="cost-breakdown">
                {entries.map((item) => (
                  <div key={item.label}>
                    <dt>
                      <span style={{ background: item.color }} />
                      {item.label}
                    </dt>
                    <dd>
                      {item.label === "Wegenbelasting" && taxIncomplete
                        ? "Nog niet berekend"
                        : currency(item.value, 2)}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )
        )}
        <div className="estimate-disclaimer">
          <Info size={15} />
          <span>
            Voorbeeldscenario, geen offerte. Exclusief aanschaf, afschrijving en
            financiering. Controleer alle ingevulde bedragen.
          </span>
        </div>
      </div>
    </div>
  );
}
