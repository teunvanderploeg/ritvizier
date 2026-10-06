"use client";
import { useState } from "react";
import type { Vehicle } from "@/types/vehicle";
import { numeric } from "@/lib/formatting";
import { amsterdamToday } from "./timeline";

export function MileageEstimate({ vehicle }: { vehicle: Vehicle }) {
  const [input, setInput] = useState("");
  const days = vehicle.firstRegistrationDate
    ? (Date.parse(amsterdamToday()) -
        Date.parse(vehicle.firstRegistrationDate)) /
      86400000
    : null;
  const mileage = Number(input);
  const valid =
    input !== "" &&
    Number.isInteger(mileage) &&
    mileage >= 0 &&
    mileage <= 2000000;
  const average =
    valid && days != null && days >= 365 ? mileage / (days / 365.2425) : null;
  return (
    <section className="mileage-estimate">
      <h2>Jouw kilometerstand vergelijken</h2>
      <p>
        Vul zelf de actuele stand in voor een gemiddeld aantal kilometers per
        jaar. Je invoer wordt niet als officieel geregistreerde kilometerstand
        gebruikt.
      </p>
      <label htmlFor="current-mileage">Actuele kilometerstand</label>
      <div className="mileage-input">
        <input
          id="current-mileage"
          type="number"
          min="0"
          max="2000000"
          step="1"
          inputMode="numeric"
          placeholder="Bijvoorbeeld 128400"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <span>km</span>
      </div>
      <p aria-live="polite" className="mileage-result">
        {input === ""
          ? "Gebaseerd op jouw invoer en de voertuigleeftijd."
          : !valid
            ? "Vul een hele kilometerstand tussen 0 en 2.000.000 in."
            : average != null
              ? `Berekend gemiddelde: ongeveer ${numeric(Math.round(average), "km per jaar")}.`
              : "Dit gemiddelde is beschikbaar vanaf een voertuigleeftijd van één jaar."}
      </p>
    </section>
  );
}
